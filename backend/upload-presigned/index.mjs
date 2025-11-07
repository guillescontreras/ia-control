import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1' });
const BUCKET_NAME = 'ia-control-coirontech';

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { filename, filetype } = body;
    
    if (!filename || !filetype) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'filename y filetype son requeridos' })
      };
    }
    
    const key = `employee-faces/${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: filetype,
    });
    
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        presignedUrl,
        key,
        bucket: BUCKET_NAME
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        error: 'Error generando presigned URL',
        details: error.message
      })
    };
  }
};
