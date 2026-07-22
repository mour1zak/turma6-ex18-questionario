const API_URL = 'http://localhost:3000/perguntas';
const API_URL_FORM = 'http://localhost:3000/formularios';
const API_URL_RESPOSTA = 'http://localhost:3000/respostas';

// Verifica se estamos editando (se tem ?id= na URL)
const urlParams = new URLSearchParams(window.location.search);
const idEditando = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('form-pergunta');
    const btnSalvar = form.querySelector('button[type="submit"]');
    const containerAlternativas = document.getElementById('container-alternativas');
    const tipoSelect = document.getElementById('tipo');
    const alternativasTextarea = document.getElementById('alternativas');

    // Se for edição, carrega os dados
    if (idEditando) {
        btnSalvar.textContent = 'Atualizar Pergunta';
        await carregarDadosParaEdicao(idEditando);
    }

    // Mostra/esconde o campo de alternativas baseado no tipo
    tipoSelect.addEventListener('change', function() {
        if (this.value === 'multipla_escolha' || this.value === 'checkbox') {
            containerAlternativas.style.display = 'block';
        } else {
            containerAlternativas.style.display = 'none';
        }
    });

    // Dispara o evento change ao carregar para esconder/mostrar corretamente
    tipoSelect.dispatchEvent(new Event('change'));

    // Evento de Submit
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const enunciado = document.getElementById('enunciado').value.trim();
        const tipo = tipoSelect.value;
        const obrigatoria = document.getElementById('obrigatoria').checked;
        const alternativasTexto = alternativasTextarea.value;

        // --- VALIDAÇÕES BÁSICAS ---
        if (!enunciado) {
            alert('O enunciado não pode ser vazio!');
            return;
        }

        let alternativas = [];
        if (tipo === 'multipla_escolha' || tipo === 'checkbox') {
            alternativas = alternativasTexto
                .split('\n')
                .map(alt => alt.trim())
                .filter(alt => alt !== ''); // Remove linhas vazias

            // Validação de duplicidade
            const unicas = new Set(alternativas);
            if (unicas.size !== alternativas.length) {
                alert('Existem alternativas duplicadas!');
                return;
            }

            // Validação de quantidade
            if (tipo === 'multipla_escolha') {
                if (alternativas.length < 2 || alternativas.length > 10) {
                    alert('Múltipla Escolha deve ter entre 2 e 10 alternativas!');
                    return;
                }
            } else if (tipo === 'checkbox') {
                if (alternativas.length < 3 || alternativas.length > 15) {
                    alert('Checkbox deve ter entre 3 e 15 alternativas!');
                    return;
                }
            }
        }

        // 🔴 REGRA 8: Verificar se a pergunta já foi respondida
        if (idEditando) {
            const podeAlterar = await verificarSePodeAlterarPergunta(idEditando, tipo, alternativas);
            if (!podeAlterar) {
                return; // Bloqueia o salvamento
            }
        }

        // Monta o objeto
        const pergunta = {
            enunciado,
            tipo,
            obrigatoria,
            alternativas,
            criadaEm: idEditando ? undefined : new Date().toISOString()
        };

        if (!pergunta.criadaEm) delete pergunta.criadaEm;

        try {
            let response;
            if (idEditando) {
                // UPDATE (PUT)
                response = await fetch(`${API_URL}/${idEditando}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pergunta)
                });
            } else {
                // CREATE (POST)
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pergunta)
                });
            }

            if (response.ok) {
                alert(idEditando ? 'Pergunta atualizada com sucesso!' : 'Pergunta cadastrada com sucesso!');
                window.location.href = 'perguntas.html';
            } else {
                alert('Erro ao salvar a pergunta.');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão com o servidor.');
        }
    });
});

// 🔴 REGRA 8: Função para verificar se pode alterar tipo/alternativas
async function verificarSePodeAlterarPergunta(idPergunta, novoTipo, novasAlternativas) {
    try {
        // 1. Buscar todos os formulários publicados
        const resFormularios = await fetch(`${API_URL_FORM}?status=publicado`);
        const formulariosPublicados = await resFormularios.json();

        // 2. Verificar se esta pergunta está em algum formulário publicado
        const formularioComPergunta = formulariosPublicados.find(f => 
            f.perguntas.includes(parseInt(idPergunta))
        );

        if (!formularioComPergunta) {
            // A pergunta não está em nenhum formulário publicado, pode alterar livremente
            return true;
        }

        // 3. Verificar se o formulário já tem respostas
        const resRespostas = await fetch(`${API_URL_RESPOSTA}?formularioId=${formularioComPergunta.id}`);
        const respostas = await resRespostas.json();

        if (respostas.length === 0) {
            // Formulário publicado mas sem respostas, pode alterar
            return true;
        }

        // 4. Formulário publicado E tem respostas - aplicar restrições da Regra 8
        // Buscar a pergunta atual para comparar
        const resPerguntaAtual = await fetch(`${API_URL}/${idPergunta}`);
        const perguntaAtual = await resPerguntaAtual.json();

        // Verificar se está tentando mudar o TIPO
        if (perguntaAtual.tipo !== novoTipo) {
            alert('⚠️ REGRA 8: Não é possível alterar o tipo de uma pergunta que já foi respondida em formulário publicado. Você deve criar uma nova pergunta.');
            return false;
        }

        // Verificar se está tentando mudar as ALTERNATIVAS (para múltipla escolha ou checkbox)
        if ((novoTipo === 'multipla_escolha' || novoTipo === 'checkbox')) {
            const alternativasAtuais = perguntaAtual.alternativas || [];
            
            // Comparar se as alternativas são diferentes
            const mesmasAlternativas = 
                alternativasAtuais.length === novasAlternativas.length &&
                alternativasAtuais.every((alt, index) => alt === novasAlternativas[index]);

            if (!mesmasAlternativas) {
                alert('⚠️ REGRA 8: Não é possível alterar as alternativas de uma pergunta que já foi respondida em formulário publicado. Você deve criar uma nova pergunta.');
                return false;
            }
        }

        // Pode alterar (só mudou enunciado ou obrigatoriedade)
        return true;

    } catch (error) {
        console.error('Erro ao verificar Regra 8:', error);
        alert('Erro ao verificar restrições de edição.');
        return false;
    }
}

async function carregarDadosParaEdicao(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const pergunta = await response.json();

        document.getElementById('enunciado').value = pergunta.enunciado;
        document.getElementById('tipo').value = pergunta.tipo;
        document.getElementById('obrigatoria').checked = pergunta.obrigatoria;
        document.getElementById('alternativas').value = pergunta.alternativas ? pergunta.alternativas.join('\n') : '';
    } catch (error) {
        alert('Erro ao carregar pergunta para edição.');
        window.location.href = 'perguntas.html';
    }
}