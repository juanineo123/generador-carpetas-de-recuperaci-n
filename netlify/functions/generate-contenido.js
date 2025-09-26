// Cargar las variables de entorno desde un archivo .env en desarrollo local
require('dotenv').config();

// Importar el SDK de Google Generative AI
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- INICIALIZACIÓN DE LA API DE GEMINI ---
// Es crucial asegurarse de que la variable de entorno GEMINI_API_KEY esté configurada.
// En Netlify, esto se configura en la UI del sitio. Localmente, en un archivo .env.
if (!process.env.GEMINI_API_KEY) {
  throw new Error("La variable de entorno GEMINI_API_KEY no está definida.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


// --- FUNCIÓN HANDLER DE NETLIFY ---
// Netlify ejecuta esta función 'handler' cada vez que se recibe una petición.
exports.handler = async (event) => {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // 405 Method Not Allowed
      body: JSON.stringify({ error: 'Método no permitido. Solo se aceptan peticiones POST.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    // 1. Parsear el cuerpo de la petición para obtener el prompt
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400, // 400 Bad Request
        body: JSON.stringify({ error: 'El campo "prompt" es requerido en el cuerpo de la petición.' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // 2. Llamar a la API de Gemini para generar el contenido
    // =======================================================
    // >>> PUNTO DE DEBUG 1: ¿La clave está cargada y el prompt es correcto?
    console.log("DEBUG 1: Iniciando llamada a Google AI.");
    console.log("DEBUG 1: Clave API presente:", !!process.env.GEMINI_API_KEY); 
    console.log(`DEBUG 1: Prompt a enviar (primeras 50 chars): ${prompt.substring(0, 50)}...`);
    // =======================================================
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 3. Devolver el texto generado en una respuesta exitosa
    return {
      statusCode: 200,
      body: JSON.stringify({ text }),
      headers: {
        'Content-Type': 'application/json',
      },
    };

  } catch (error) {
    // =======================================================
    // >>> PUNTO DE DEBUG 2: Imprimir el objeto de error COMPLETO
    console.error("DEBUG 2: Error completo capturado (esto debe mostrar el 404):");
    console.error(error); // Imprimirá toda la estructura detallada del error de Google AI
    // =======================================================
    // Manejo de errores durante la ejecución
    console.error("Error en la función generate-contenido:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Ocurrió un error interno en el servidor al generar el contenido.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
