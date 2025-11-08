import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const polly = new PollyClient({ region: 'us-east-1' });
const s3 = new S3Client({ region: 'us-east-1' });

const BUCKET = 'ia-control-coirontech';

export const handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const { text } = JSON.parse(event.body);

    // Generar audio con Polly
    const pollyResponse = await polly.send(new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: 'Lupe',
      Engine: 'generative',
      LanguageCode: 'es-US'
    }));

    const audioBuffer = await pollyResponse.AudioStream.transformToByteArray();
    const fileName = `tts/${Date.now()}.mp3`;

    // Subir a S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileName,
      Body: audioBuffer,
      ContentType: 'audio/mpeg'
    });
    
    await s3.send(putCommand);

    // Generar presigned URL válida por 1 hora
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET,
      Key: fileName
    });
    const audioUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ audioUrl })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};
