const API_URL_FORM = 'http://localhost:3000/formularios';
const API_URL_PERG = 'http://localhost:3000/perguntas';
const API_URL_RESPOSTA = 'http://localhost:3000/respostas';

const urlParams = new URLSearchParams(window.location.search);
const formularioId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const containerStatus = document.getElementById('container-status');
    const containerForm = document.getElementById('container-formulario');

    if (!formularioId) {
        if (containerStatus) containerStatus.innerHTML = '<p style="color: red;">ID do formulário não informado.</p>';
        return;
    }

    try {
        const resForm = await fetch(`${API_URL_FORM}/${formularioId}`);
        if (!resForm.ok) throw new Error('Formulário não encontrado.');
        const form = await resForm.json();

        const statusMsg = validarStatusFormulario(form);
        if (statusMsg) {
            if (containerStatus) containerStatus.innerHTML = `<p style="color: red; font-weight: bold;">⚠️ ${statusMsg}</p>`;
            return;
        }

        if (containerForm) containerForm.style.display = 'block';
        
        const tituloEl = document.getElementById('titulo-formulario');
        const descEl = document.getElementById('descricao-formulario');
        if (tituloEl) tituloEl.textContent = form.titulo;
        if (descEl) descEl.textContent = form.descricao || '';

        const idsQuery = form.perguntas.filter(id => id).map(id => `id=${id}`).join('&');
        const resPergs = await fetch(`${API_URL_PERG}?${idsQuery}`);
        const perguntas = await resPergs.json();

        renderizarPerguntas(perguntas);
        
        const formResposta = document.getElementById('form-resposta');
        if (formResposta) {
            formResposta.addEventListener('submit', async function(event) {
                event.preventDefault();
                await processarResposta(form, perguntas);
            });
        }
    } catch (error) {
        if (containerStatus) containerStatus.innerHTML = `<p style="color: red;">Erro: ${error.message}</p>`;
    }
});

function validarStatusFormulario(form) {
    if (form.status !== 'publicado') {
        return 'Formulário não disponível (Status: ' + form.status + ').';
    }
    const agora = new Date();
    if (form.dataInicio && agora < new Date(form.dataInicio)) {
        return 'Formulário ainda não disponível.';
    }
    if (form.dataFim && agora > new Date(form.dataFim)) {
        return 'Prazo para resposta encerrado.';
    }
    return null;
}

function renderizarPerguntas(perguntas) {
    const container = document.getElementById('container-perguntas');
    if (!container) return;
    container.innerHTML = '';
    
    perguntas.forEach((pergunta, index) => {
        const div = document.createElement('div');
        div.style.marginBottom = '20px';
        div.style.padding = '15px';
        div.style.border = '1px solid #ddd';
        div.style.borderRadius = '5px';
        
        const obrigatorio = pergunta.obrigatoria ? '<span style="color: red;">*</span>' : '';
        let htmlInput = '';

        switch (pergunta.tipo) {
            case 'texto_curto':
                htmlInput = `<input type="text" name="pergunta_${pergunta.id}" maxlength="200" style="width: 100%; padding: 8px;">`;
                break;
            case 'texto_longo':
                htmlInput = `<textarea name="pergunta_${pergunta.id}" rows="4" style="width: 100%; padding: 8px;"></textarea>`;
                break;
            case 'multipla_escolha':
                pergunta.alternativas.forEach(alt => {
                    htmlInput += `<label style="display: block; margin: 5px 0;"><input type="radio" name="pergunta_${pergunta.id}" value="${alt}"> ${alt}</label>`;
                });
                break;
            case 'checkbox':
                pergunta.alternativas.forEach(alt => {
                    htmlInput += `<label style="display: block; margin: 5px 0;"><input type="checkbox" name="pergunta_${pergunta.id}" value="${alt}"> ${alt}</label>`;
                });
                break;
        }

        div.innerHTML = `<p><strong>${index + 1}. ${pergunta.enunciado}</strong> ${obrigatorio}</p>${htmlInput}`;
        container.appendChild(div);
    });
}

async function processarResposta(form, perguntas) {
    const containerStatus = document.getElementById('container-status');
    if (containerStatus) containerStatus.innerHTML = '';

    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    
    if (!nomeInput || !emailInput) {
        if (containerStatus) containerStatus.innerHTML = '<p style="color: red;">Erro: Campos não encontrados.</p>';
        return;
    }

    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    if (nome.length < 2) {
        if (containerStatus) containerStatus.innerHTML = '<p style="color: red;">⚠️ Nome deve ter pelo menos 2 caracteres.</p>';
        return;
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        if (containerStatus) containerStatus.innerHTML = '<p style="color: red;">⚠️ E-mail inválido.</p>';
        return;
    }

    // Regra 4: Verificar duplicidade
    try {
        const resDuplicidade = await fetch(`${API_URL_RESPOSTA}?formularioId=${form.id}`);
        const respostasExistentes = await resDuplicidade.json();
        const jaRespondeu = respostasExistentes.some(r => r.email.toLowerCase().trim() === email);
        
        if (jaRespondeu) {
            if (containerStatus) containerStatus.innerHTML = '<p style="color: red;">⚠️ Você já respondeu este formulário.</p>';
            return;
        }
    } catch (error) {
        if (containerStatus) containerStatus.innerHTML = '<p style="color: red;">Erro ao verificar duplicidade.</p>';
        return;
    }

    // Coletar respostas - CORREÇÃO AQUI!
    const respostasArray = [];
    const perguntasFaltando = [];

    for (const pergunta of perguntas) {
        let valor = null;
        
        if (pergunta.tipo === 'checkbox') {
            const checkboxes = document.querySelectorAll(`input[name="pergunta_${pergunta.id}"]:checked`);
            valor = Array.from(checkboxes).map(cb => cb.value);
        } else {
            const input = document.querySelector(`[name="pergunta_${pergunta.id}"]:checked`) || 
                          document.querySelector(`[name="pergunta_${pergunta.id}"]`);
            if (input) valor = input.value;
        }

        if (pergunta.obrigatoria && !valor) {
            perguntasFaltando.push(pergunta.enunciado);
        } else if (valor !== null) {
            // CORREÇÃO: Adicionar no formato CORRETO { perguntaId, valor }
            respostasArray.push({ 
                perguntaId: pergunta.id, 
                valor: valor 
            });
        }
    }

    if (perguntasFaltando.length > 0) {
        if (containerStatus) containerStatus.innerHTML = `<p style="color: red;">⚠️ Responda: ${perguntasFaltando.join(', ')}</p>`;
        return;
    }

    // Enviar resposta - ESTRUTURA CORRETA CONFORME ENUNCIADO
    try {
        const novaResposta = {
            formularioId: form.id,
            nome: nome,
            email: email,
            respostas: respostasArray,  // Array de { perguntaId, valor }
            enviadoEm: new Date().toISOString()
        };

        console.log('Enviando resposta:', novaResposta);

        const response = await fetch(API_URL_RESPOSTA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaResposta)
        });

        if (response.ok) {
            if (containerStatus) {
                containerStatus.innerHTML = `
                    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; text-align: center; margin-top: 10px;">
                        <h3 style="color: #155724; margin: 0;">✅ Resposta enviada com sucesso!</h3>
                        <p style="color: #155724; margin: 10px 0 0 0;">Obrigado por participar!</p>
                    </div>
                `;
            }
            const formResposta = document.getElementById('form-resposta');
            if (formResposta) formResposta.reset();
        } else {
            if (containerStatus) containerStatus.innerHTML = '<p style="color: red;">Erro ao enviar.</p>';
        }
    } catch (error) {
        console.error('Erro:', error);
        if (containerStatus) containerStatus.innerHTML = '<p style="color: red;">Erro de conexão.</p>';
    }
}

function validarResposta(pergunta, valor) {
    switch (pergunta.tipo) {
        case 'texto_curto':
            return valor.length > 200 ? 'Máximo 200 caracteres.' : null;
        case 'texto_longo':
            return null;
        case 'multipla_escolha':
            return pergunta.alternativas.includes(valor) ? null : 'Valor inválido.';
        case 'checkbox':
            if (!Array.isArray(valor) || valor.length === 0) return 'Selecione pelo menos uma opção.';
            const invalidos = valor.filter(v => !pergunta.alternativas.includes(v));
            return invalidos.length > 0 ? `Opções inválidas: ${invalidos.join(', ')}.` : null;
        default:
            return 'Tipo não reconhecido.';
    }
}