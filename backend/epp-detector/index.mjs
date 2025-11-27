import { RekognitionClient, DetectProtectiveEquipmentCommand } from '@aws-sdk/client-rekognition';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const rekognition = new RekognitionClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: 'us-east-1' });

const ZONES_TABLE = 'ia-control-epp-zones';
const LOGS_TABLE = 'ia-control-epp-logs';
const ALERTS_TABLE = 'ia-control-alerts';
const BUCKET = 'ia-control-epp-captures';

export const handler = async (event) => {
  console.log('🔍 EPP Detection request:', JSON.stringify(event));

  try {
    const body = JSON.parse(event.body);
    const { imageBase64, cameraId, zoneId } = body;

    if (!imageBase64 || !cameraId || !zoneId) {
      return response(400, { error: 'Missing required fields' });
    }

    // Get zone configuration
    const zoneData = await docClient.send(new GetCommand({
      TableName: ZONES_TABLE,
      Key: { zoneId }
    }));

    if (!zoneData.Item) {
      return response(404, { error: 'Zone not found' });
    }

    const zone = zoneData.Item;
    console.log('📋 Zone config:', zone.zoneName, zone.requiredEPP);

    // Detect PPE with Rekognition
    const imageBytes = Buffer.from(imageBase64, 'base64');
    const detectCommand = new DetectProtectiveEquipmentCommand({
      Image: { Bytes: imageBytes },
      SummarizationAttributes: { MinConfidence: 80, RequiredEquipmentTypes: ['FACE_COVER', 'HAND_COVER', 'HEAD_COVER'] }
    });

    const detection = await rekognition.send(detectCommand);
    console.log('🔍 Rekognition result:', JSON.stringify(detection.Summary));

    // Analyze compliance
    const persons = detection.Persons || [];
    const compliance = analyzeCompliance(persons, zone);
    console.log('📊 Compliance:', compliance);

    const timestamp = Date.now();
    const logId = uuidv4();

    // Save log
    await docClient.send(new PutCommand({
      TableName: LOGS_TABLE,
      Item: {
        logId,
        zoneId,
        zoneName: zone.zoneName,
        cameraId,
        timestamp,
        personsDetected: persons.length,
        compliant: compliance.compliant,
        compliancePercentage: compliance.percentage,
        missingEPP: compliance.missingEPP,
        detectionDetails: {
          summary: detection.Summary,
          personsCount: persons.length
        }
      }
    }));

    // Generate alert if non-compliant (with deduplication)
    if (!compliance.compliant) {
      const shouldCreateAlert = await checkAlertDeduplication(zoneId, cameraId, compliance.missingEPP);
      
      if (shouldCreateAlert) {
        const alertId = uuidv4();
        const imageKey = `violations/${zoneId}/${timestamp}-${alertId}.jpg`;

        // Save image to S3
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: imageKey,
          Body: imageBytes,
          ContentType: 'image/jpeg'
        }));

        // Create alert
        await docClient.send(new PutCommand({
          TableName: ALERTS_TABLE,
          Item: {
            alertId,
            tipo: 'epp_violation',
            type: 'epp_violation',
            severity: compliance.critical ? 'high' : 'medium',
            timestamp,
            zoneId,
            zoneName: zone.zoneName,
            cameraId,
            descripcion: `Incumplimiento EPP detectado: ${compliance.missingEPP.join(', ')}`,
            message: `Incumplimiento EPP detectado: ${compliance.missingEPP.join(', ')}`,
            details: {
              personsDetected: persons.length,
              compliancePercentage: compliance.percentage,
              missingEPP: compliance.missingEPP,
              criticalViolation: compliance.critical
            },
            imageUrl: imageKey,
            resuelta: false,
            lastUpdated: timestamp
          }
        }));

        console.log('🚨 Alert created:', alertId);
      } else {
        console.log('⏭️ Alert skipped (duplicate within 30s)');
      }
    }

    return response(200, {
      success: true,
      logId,
      compliance: {
        compliant: compliance.compliant,
        percentage: compliance.percentage,
        missingEPP: compliance.missingEPP,
        critical: compliance.critical
      },
      personsDetected: persons.length
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return response(500, { error: error.message });
  }
};

function analyzeCompliance(persons, zone) {
  if (persons.length === 0) {
    return { compliant: true, percentage: 100, missingEPP: [], critical: false };
  }

  const required = zone.requiredEPP;
  const critical = zone.criticalEPP || [];
  const threshold = zone.complianceThreshold || 80;

  let totalChecks = 0;
  let passedChecks = 0;
  const missingEPP = new Set();
  let hasCriticalViolation = false;

  persons.forEach(person => {
    const bodyParts = person.BodyParts || [];

    // Check helmet (HEAD_COVER)
    if (required.helmet) {
      totalChecks++;
      const head = bodyParts.find(bp => bp.Name === 'HEAD');
      const hasHelmet = head?.EquipmentDetections?.some(eq => 
        eq.Type === 'HEAD_COVER' && eq.CoversBodyPart?.Value
      );
      if (hasHelmet) {
        passedChecks++;
      } else {
        missingEPP.add('helmet');
        if (critical.includes('helmet')) hasCriticalViolation = true;
      }
    }

    // Check vest (not directly detected by Rekognition, assume compliant for now)
    if (required.vest) {
      totalChecks++;
      passedChecks++; // TODO: Implement vest detection logic
    }

    // Check face cover
    if (required.faceCover) {
      totalChecks++;
      const face = bodyParts.find(bp => bp.Name === 'FACE');
      const hasFaceCover = face?.EquipmentDetections?.some(eq => 
        eq.Type === 'FACE_COVER' && eq.CoversBodyPart?.Value
      );
      if (hasFaceCover) {
        passedChecks++;
      } else {
        missingEPP.add('faceCover');
        if (critical.includes('faceCover')) hasCriticalViolation = true;
      }
    }

    // Check hand cover (only if hands are detected)
    if (required.handCover) {
      const hands = bodyParts.filter(bp => bp.Name === 'LEFT_HAND' || bp.Name === 'RIGHT_HAND');
      if (hands.length > 0) {
        totalChecks++;
        const hasHandCover = hands.some(hand => 
          hand.EquipmentDetections?.some(eq => eq.Type === 'HAND_COVER' && eq.CoversBodyPart?.Value)
        );
        if (hasHandCover) {
          passedChecks++;
        } else {
          missingEPP.add('handCover');
          if (critical.includes('handCover')) hasCriticalViolation = true;
        }
      }
    }
  });

  const percentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
  const compliant = percentage >= threshold && !hasCriticalViolation;

  return {
    compliant,
    percentage,
    missingEPP: Array.from(missingEPP),
    critical: hasCriticalViolation
  };
}

async function checkAlertDeduplication(zoneId, cameraId, missingEPP) {
  const now = Date.now();
  const thirtySecondsAgo = now - 30000;
  
  try {
    const result = await docClient.send(new GetCommand({
      TableName: ALERTS_TABLE,
      Key: { 
        alertId: `DEDUP-${zoneId}-${cameraId}`,
        timestamp: 0
      }
    }));
    
    if (result.Item) {
      const lastAlert = result.Item;
      const isSameViolation = JSON.stringify(lastAlert.details?.missingEPP?.sort()) === JSON.stringify(missingEPP.sort());
      const isRecent = lastAlert.lastUpdated > thirtySecondsAgo;
      
      if (isSameViolation && isRecent) {
        return false;
      }
    }
    
    // Update dedup record
    await docClient.send(new PutCommand({
      TableName: ALERTS_TABLE,
      Item: {
        alertId: `DEDUP-${zoneId}-${cameraId}`,
        timestamp: 0,
        lastUpdated: now,
        details: { missingEPP },
        resuelta: true
      }
    }));
    
    return true;
  } catch (error) {
    console.error('Error checking deduplication:', error);
    return true;
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}
