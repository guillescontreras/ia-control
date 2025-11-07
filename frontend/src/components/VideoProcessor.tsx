import React, { useState } from 'react';
import { API_URL } from '../config';

interface ProcessResult {
  empleadoId?: string;
  nombre?: string;
  confianza?: number;
  objetos?: string[];
  alertas?: any[];
}

const VideoProcessor: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setProcessing(true);
    setResult(null);

    try {
      const base64 = await fileToBase64(file);
      
      const response = await fetch(`${API_URL}/process-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64.split(',')[1],
          cameraId: 'CAM-001'
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      alert('Error procesando imagen: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">🎥 Procesamiento de Video</h2>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subir Frame de Video
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={processing}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {imagePreview && (
            <div className="mt-4">
              <img src={imagePreview} alt="Preview" className="max-w-md rounded-lg shadow" />
            </div>
          )}

          {processing && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Procesando imagen...</p>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Resultados del Análisis</h3>
              
              {result.empleadoId ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <div>
                      <p className="font-semibold text-green-900">Empleado Identificado</p>
                      <p className="text-green-700">
                        {result.nombre} (ID: {result.empleadoId})
                      </p>
                      <p className="text-sm text-green-600">
                        Confianza: {result.confianza?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">⚠️</span>
                    <div>
                      <p className="font-semibold text-red-900">Persona No Autorizada</p>
                      <p className="text-red-700">No se encontró coincidencia en la base de datos</p>
                    </div>
                  </div>
                </div>
              )}

              {result.objetos && result.objetos.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-900 mb-2">Objetos Detectados:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.objetos.map((obj, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.alertas && result.alertas.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="font-semibold text-yellow-900 mb-2">⚠️ Alertas Generadas:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.alertas.map((alerta, idx) => (
                      <li key={idx} className="text-yellow-800">{alerta.descripcion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoProcessor;
