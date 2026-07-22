const API_URL_FORM = 'http://localhost:3000/formularios';
const API_URL_PERG = 'http://localhost:3000/perguntas';
const API_URL_RESPOSTA = 'http://localhost:3000/respostas';

// Pega o ID do formulário pela URL (ex: responder.html?id=1)
const urlParams = new URLSearchParams(window.location.search);
const formularioId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const containerStatus = document.getElementById('container-status');
    const containerForm = document.getElementById('container-formulario');

    if (!formularioId) {
        containerStatus.innerHTML = '<p style="color: red;">ID do formulário não informado na URL.</p>';
        return;
    }

    try {
        // 1. Buscar o formulário
        const resForm = await fetch(`${API_URL_FORM}/${formularioId}`);
        if (!resForm.ok) throw new Error('Formulário não encontrado.');
        const form = await resForm.json();

        // 2. Validar Regra 3: Status e Vigência
        const statusMsg = validarStatusFormulario(form);
        if (statusMsg) {
            containerStatus.innerHTML = `<p style="color: red; font-weight: bold;">⚠️ ${statusMsg}</p>`;
            return; // Para a execução se estiver inválido
        }

        // Se passou, exibe o formulário
        containerForm.style.display = 'block';
        document.getElementById('titulo-formulario').textContent = form.titulo;
        document.getElementById('descricao-formulario').textContent = form.descricao || '';

        // 3. Buscar as perguntas vinculadas
        const idsQuery = form.perguntas.map(id => `id=${id}`).join('&');
        const idsQuery = form.perguntas.filter(id => id).map(id => `id=${id}`).join('&');
        const perguntas = await resPergs.json();

        // 4. Renderizar as perguntas
        renderizarPerguntas(perguntas);
        
        // 5. Adicionar evento de submit
        document.getElementById('form-resposta').addEventListener('submit', async function(event) {
            event.preventDefault();
            await processarResposta(form, perguntas);
        });

    } catch (error) {
        console.error(error);
        containerStatus.innerHTML = `<p style="color: red;">Erro ao carregar o formulário: ${error.message}</p>`;
    }
});

// Função para validar a Regra 3 do enunciado
function validarStatusFormulario(form) {
    if (form.status !== 'publicado') {
        return 'Este formulário não está disponível no momento (Status: ' + form.status + ').';
    }

    const agora = new Date();
    
    if (form.dataInicio && new Date(agora) < new Date(form.dataInicio)) {
        return 'Este formulário ainda não está disponível para resposta.';
    }
    
    if (form.dataFim && new Date(agora) > new Date(form.dataFim)) {
        return 'O prazo para responder este formulário encerrou.';
    }

    return null; // null significa que está tudo ok
}

// Função para desenhar as perguntas na tela
function renderizarPerguntas(perguntas) {
    const container = document.getElementById('container-perguntas');
    container.innerHTML = '';

    perguntas.forEach((pergunta, index) => {
        const div = document.createElement('div');
        div.style.marginBottom = '20px';
        div.style.padding = '10px';
        div.style.border = '1px solid #eee';
        div.style.borderRadius = '5px';

        const obrigatorio = pergunta.obrigatoria ? '<span style="color: red;">*</span>' : '';
        
        let htmlInput = '';

        // Lógica para renderizar o input correto baseado no tipo (Seção 3 do enunciado)
        switch (pergunta.tipo) {
            case 'texto_curto':
                htmlInput = `<input type="text" name="pergunta_${pergunta.id}" maxlength="200">`;
                break;
            case 'texto_longo':
                htmlInput = `<textarea name="pergunta_${pergunta.id}" rows="4"></textarea>`;
                break;
            case 'multipla_escolha':
                pergunta.alternativas.forEach(alt => {
                    htmlInput += `
                        <label style="display: block; margin: 5px 0;">
                            <input type="radio" name="pergunta_${pergunta.id}" value="${alt}"> ${alt}
                        </label>
                    `;
                });
                break;
            case 'checkbox':
                pergunta.alternativas.forEach(alt => {
                    htmlInput += `
                        <label style="display: block; margin: 5px 0;">
                            <input type="checkbox" name="pergunta_${pergunta.id}" value="${alt}"> ${alt}
                        </label>
                    `;
                });
                break;
        }

        div.innerHTML = `
            <p><strong>${index + 1}. ${pergunta.enunciado}</strong> ${obrigatorio}</p>
            ${htmlInput}
        `;
        container.appendChild(div);
    });
}

// Função para processar a resposta (validação + envio)
async function processarResposta(form, perguntas) {
    const containerStatus = document.getElementById('container-status');
    containerStatus.innerHTML = '';

    // 1. Validar dados do usuário
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase().trim();

    // Validação Regra 5: Nome (mínimo 2 caracteres)
    if (nome.length < 2) {
        containerStatus.innerHTML = '<p style="color: red;">⚠️ O nome deve ter pelo menos 2 caracteres.</p>';
        return;
    }

    // Validação Regra 5: Email (formato válido)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        containerStatus.innerHTML = '<p style="color: red;">⚠️ E-mail inválido.</p>';
        return;
    }

    // 2. Verificar duplicidade de resposta (Regra 4)
    try {
        const resDuplicidade = await fetch(`${API_URL_RESPOSTA}?formularioId=${form.id}&email=${email}`);
        const respostas = await resDuplicidade.json();

        if (respostas.length > 0) {
            containerStatus.innerHTML = '<p style="color: red;">⚠️ Você já respondeu este formulário com este e-mail.</p>';
            return;
        }
    } catch (error) {
        console.error('Erro ao verificar duplicidade:', error);
        containerStatus.innerHTML = '<p style="color: red;">Erro ao verificar duplicidade de resposta.</p>';
        return;
    }

    // 3. Coletar respostas
    const respostas = [];
    let perguntaObrigatoriaSemResposta = [];

    // Para cada pergunta, coletar a resposta
    perguntas.forEach(pergunta => {
        let valor = null;
        const input = document.querySelector(`input[name="pergunta_${pergunta.id}"]:checked`) || 
                      document.querySelector(`textarea[name="pergunta_${pergunta.id}"]`) || 
                      document.querySelector(`input[name="pergunta_${pergunta.id}"]`);
        
        // Para checkbox, precisamos coletar todos os marcados
        if (pergunta.tipo === 'checkbox') {
            const checkboxes = document.querySelectorAll(`input[name="pergunta_${pergunta.id}"]:checked`);
            valor = Array.from(checkboxes).map(cb => cb.value);
        } else if (input) {
            valor = input.value;
        }

        // Verificar se é obrigatória e não tem resposta
        if (pergunta.obrigatoria && !valor) {
            perguntaObrigatoriaSemResposta.push(pergunta.enunciado);
        } else if (valor) {
            // Validação do valor conforme tipo da pergunta
            const validacao = validarResposta(pergunta, valor);
            if (validacao) {
                containerStatus.innerHTML = `<p style="color: red;">⚠️ ${validacao}</p>`;
                return;
            }
            respostas.push({ perguntaId: pergunta.id, valor });
        }
    });

    // Verificar se há perguntas obrigatórias sem resposta
    if (perguntaObrigatoriaSemResposta.length > 0) {
        containerStatus.innerHTML = `<p style="color: red;">⚠️ Respostas faltando: ${perguntaObrigatoriaSemResposta.join(', ')}</p>`;
        return;
    }

    // 4. Enviar para o servidor
    try {
        const novaResposta = {
            formularioId: form.id,
            nome: nome,
            email: email,
            respostas: respostas,
            enviadoEm: new Date().toISOString()
        };

        const response = await fetch(API_URL_RESPOSTA, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novaResposta)
        });

        if (response.ok) {
            containerStatus.innerHTML = '<p style="color: green; font-weight: bold;">✅ Resposta enviada com sucesso!</p>';
            document.getElementById('form-resposta').reset();
        } else {
            containerStatus.innerHTML = '<p style="color: red;">Erro ao enviar a resposta.</p>';
        }
    } catch (error) {
        console.error('Erro ao enviar resposta:', error);
        containerStatus.innerHTML = '<p style="color: red;">Erro de conexão com o servidor.</p>';
    }
}

// Função para validar a resposta conforme o tipo da pergunta
function validarResposta(pergunta, valor) {
    switch (pergunta.tipo) {
        case 'texto_curto':
            if (valor.length > 200) {
                return 'Texto curto não pode ter mais de 200 caracteres.';
            }
            return null;
        case 'texto_longo':
            return null; // Sem limite de tamanho
        case 'multipla_escolha':
            if (!pergunta.alternativas.includes(valor)) {
                return 'Valor inválido para múltipla escolha.';
            }
            return null;
        case 'checkbox':
            if (!Array.isArray(valor)) {
                return 'Checkbox deve ser um array de valores.';
            }
            if (valor.length === 0) {
                return 'Checkbox deve ter pelo menos uma opção selecionada.';
            }
            // Verificar se todos os valores existem nas alternativas
            const invalidos = valor.filter(v => !pergunta.alternativas.includes(v));
            if (invalidos.length > 0) {
                return `Valores inválidos para checkbox: ${invalidos.join(', ')}.`;
            }
            return null;
        default:
            return 'Tipo de pergunta não reconhecido.';
    }
}