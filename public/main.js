document.addEventListener('DOMContentLoaded', () => {
    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const wizardContainer = document.getElementById('wizard-container');
    const resultadoContainer = document.getElementById('resultado-container');
    const downloadSection = document.getElementById('download-section');
    const previewContent = document.getElementById('preview-content');

    // Elementos del nuevo mensaje centrado con overlay
    const statusElement = document.getElementById('floating-status');
    const statusText = document.getElementById('floating-status-text');
    const overlayElement = document.getElementById('overlay');

    // Botones
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Pasos del asistente
    const steps = document.querySelectorAll('.step');
    let currentStep = 1;

    // Elementos del formulario
    const selectNivel = document.getElementById('select-nivel');
    const selectGrado = document.getElementById('select-grado');
    const selectArea = document.getElementById('select-area');
    const competenciasContainer = document.getElementById('competencias-container');

    // Almacén para el contenido generado
    let generatedAIContent = {};

    // --- LÓGICA DEL ASISTENTE (WIZARD) ---
    const updateWizardView = () => {
        steps.forEach(step => step.classList.add('hidden-step'));
        document.getElementById(`step-${currentStep}`)?.classList.remove('hidden-step');
        prevBtn.classList.toggle('invisible', currentStep === 1);
        nextBtn.classList.toggle('hidden', currentStep === steps.length);
        generateBtn.classList.toggle('hidden', currentStep !== steps.length);
    };

    nextBtn.addEventListener('click', () => {
        if (currentStep < steps.length) {
            currentStep++;
            updateWizardView();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateWizardView();
        }
    });

    // --- LÓGICA DE MENÚS DESPLEGABLES ---
    const populateSelect = (selectElement, options, placeholder) => {
        selectElement.innerHTML = `<option value="">${placeholder}</option>`;
        options.forEach(option => {
            selectElement.innerHTML += `<option value="${option}">${option}</option>`;
        });
        selectElement.disabled = false;
    };

    const clearSelect = (selectElement, placeholder) => {
        selectElement.innerHTML = `<option value="">${placeholder}</option>`;
        selectElement.disabled = true;
    };

    const populateNiveles = () => {
        const niveles = Object.keys(curriculumData);
        populateSelect(selectNivel, niveles, 'Selecciona un nivel');
    };

    selectNivel.addEventListener('change', () => {
        const nivel = selectNivel.value;
        clearSelect(selectGrado, 'Selecciona un grado');
        clearSelect(selectArea, 'Selecciona un área');
        competenciasContainer.innerHTML = '';
        if (nivel) {
            const grados = Object.keys(curriculumData[nivel]);
            populateSelect(selectGrado, grados, 'Selecciona un grado');
        }
    });

    selectGrado.addEventListener('change', () => {
        const nivel = selectNivel.value;
        const grado = selectGrado.value;
        clearSelect(selectArea, 'Selecciona un área');
        competenciasContainer.innerHTML = '';
        if (grado) {
            const areas = Object.keys(curriculumData[nivel][grado]);
            populateSelect(selectArea, areas, 'Selecciona un área');
        }
    });

    selectArea.addEventListener('change', () => {
        const nivel = selectNivel.value;
        const grado = selectGrado.value;
        const area = selectArea.value;
        competenciasContainer.innerHTML = '';
        if (area) {
            // **AQUÍ ESTABA EL ERROR CORREGIDO**
            const { competencias } = curriculumData[nivel][grado][area];
            competencias.forEach(comp => {
                const checkboxHtml = `
                    <label class="checkbox-label">
                        <input type="checkbox" value="${comp.id}" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3">
                        <span>${comp.nombre}</span>
                    </label>
                `;
                competenciasContainer.innerHTML += checkboxHtml;
            });
        }
    });

    // --- NUEVA LÓGICA DE GENERACIÓN CON MENSAJE CENTRADO Y OVERLAY ---
    generateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const selectedCompetencias = competenciasContainer.querySelectorAll('input:checked').length;
        if (selectedCompetencias === 0) {
            alert('Por favor, selecciona al menos una competencia para continuar.');
            return;
        }
        wizardContainer.classList.add('hidden');
        resultadoContainer.classList.remove('hidden');
        startGenerationProcess();
    });

    const showStatus = (message) => {
        statusText.textContent = message;
        statusElement.classList.remove('hidden');
        overlayElement.classList.remove('hidden');
    };

    const hideStatus = () => {
        statusElement.classList.add('hidden');
        overlayElement.classList.add('hidden');
    };

    const appendContentToPreview = (title, markdownContent) => {
        const renderedHtml = window.marked.parse(markdownContent);
        const sectionHtml = `
            <div class="p-4 mb-4">
                <h3 class="font-bold text-xl mb-2 pb-2 border-b-2 border-indigo-200">${title}</h3>
                <div class="prose max-w-none">${renderedHtml}</div>
            </div>
        `;
        previewContent.insertAdjacentHTML('beforeend', sectionHtml);
    };
    
    const startGenerationProcess = async () => {
        previewContent.innerHTML = '';
        generatedAIContent = {};
        downloadSection.classList.add('hidden');

        const formData = getFormData();
        
        try {
            showStatus('Generando Presentación...');
            const presentacionPrompt = `Actúa como un docente experto de ${formData.area}. Redacta una presentación cálida y motivadora para una carpeta de recuperación. Explica brevemente que esta carpeta es una oportunidad para reforzar competencias clave para su éxito académico. Dirígete al alumno directamente.`;
            generatedAIContent['Presentación'] = await callGenerateContentAPI(presentacionPrompt);
            appendContentToPreview('Presentación', generatedAIContent['Presentación']);

            showStatus('Generando Actividades...');
            generatedAIContent['Actividades Propuestas'] = '';
            const activityPrompts = [
                `Actúa como un docente. Redacta un bloque de preguntas con el título exacto: "I. COLOQUE VERDADERO (V) O FALSO (F) SEGÚN CORRESPONDA". Debajo del título, crea 5 afirmaciones claras sobre el tema '${formData.temaPrincipal}'. NO incluyas las respuestas correctas.`,
                `Ahora, redacta un segundo bloque de preguntas con el título exacto: "II. MARQUE LA ALTERNATIVA CORRECTA". Debajo del título, crea 5 preguntas de opción múltiple sobre '${formData.temaPrincipal}'. Cada pregunta debe tener 4 alternativas (A, B, C, D). NO indiques cuál es la respuesta correcta.`,
                `Finalmente, redacta un tercer bloque con el título exacto: "III. RESUELVA LOS SIGUIENTES EJERCICIOS". Debajo, crea 3 problemas o ejercicios prácticos desafiantes para que un estudiante de ${formData.grado} de ${formData.nivel} resuelva sobre '${formData.temaPrincipal}'. Presenta solo los enunciados, SIN las soluciones.`
            ];
            let fullActivitiesContent = '';
            for (const prompt of activityPrompts) {
                const activityPart = await callGenerateContentAPI(prompt);
                fullActivitiesContent += activityPart + '\n\n';
            }
            generatedAIContent['Actividades Propuestas'] = fullActivitiesContent;
            appendContentToPreview('Actividades Propuestas', generatedAIContent['Actividades Propuestas']);

            showStatus('Generando Criterios de Evaluación...');
            const criteriosPrompt = `Redacta los criterios de evaluación para la carpeta de recuperación. Menciona puntualidad en la entrega, claridad en el desarrollo, orden y limpieza. Formatea la respuesta como una lista de viñetas.`;
            generatedAIContent['Criterios de Evaluación'] = await callGenerateContentAPI(criteriosPrompt);
            appendContentToPreview('Criterios de Evaluación', generatedAIContent['Criterios de Evaluación']);
            
            hideStatus();
            downloadSection.classList.remove('hidden');
            downloadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

        } catch (error) {
            hideStatus();
            alert(`Ocurrió un error grave durante la generación: ${error.message}`);
        }
    };

    const callGenerateContentAPI = async (prompt) => {
        try {
            const response = await fetch('/.netlify/functions/generate-contenido', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            if (!response.ok) {
                throw new Error(`La API de Gemini respondió con un error: ${response.status}`);
            }
            const data = await response.json();
            return data.text;
        } catch (error) {
            console.error("Error en callGenerateContentAPI:", error);
            throw error;
        }
    };

    // --- LÓGICA DE DATOS Y DESCARGA ---
    const getSelectedCompetencias = () => {
        const nivel = selectNivel.value;
        const grado = selectGrado.value;
        const area = selectArea.value;
        if (!nivel || !grado || !area) return [];

        const allCompetencias = curriculumData[nivel][grado][area].competencias;
        const selectedIds = Array.from(competenciasContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        
        return allCompetencias.filter(comp => selectedIds.includes(comp.id));
    };

    const getFormData = () => {
        return {
            nombreColegio: document.getElementById('nombre-colegio').value,
            nombreAlumno: document.getElementById('nombre-alumno').value,
            nombreDocente: document.getElementById('nombre-docente').value,
            nivel: selectNivel.value,
            grado: selectGrado.value,
            area: selectArea.value,
            temaPrincipal: document.getElementById('tema-principal').value,
            competencias: getSelectedCompetencias(),
        };
    };

    downloadBtn.addEventListener('click', async () => {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Preparando descarga...';

        const finalDocumentData = {
            formData: getFormData(),
            aiContent: generatedAIContent
        };
        
        try {
            const response = await fetch('/.netlify/functions/generate-word', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalDocumentData)
            });

            if (!response.ok) throw new Error(`Error en el servidor al crear el DOCX: ${response.statusText}`);
            
            const blob = await response.blob();
            const filename = `Carpeta_Recuperacion_${getFormData().nombreAlumno.replace(/ /g, '_')}.docx`;
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

        } catch (error) {
            console.error('Error al descargar el archivo:', error);
            alert(`Hubo un problema al generar el archivo .docx: ${error.message}`);
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Descargar Archivo .docx';
        }
    });

    // Inicializar la aplicación
    populateNiveles();
    updateWizardView();
});