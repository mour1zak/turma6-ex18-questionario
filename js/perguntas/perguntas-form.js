const API_URL = 'http://localhost:3000/perguntas';

// Verifica se estamos editando (se tem ?id= na URL)
const urlParams = new URLSearchParams(window.location.search);
const idEditando = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('form-pergunta');
    const btnSalvar = form.querySelector('button[type="submit"]');
    const containerAlternativas = document.getElementById('container-alternativas');

    // Se for edição, carrega os dados
    if (idEditando) {
        btnSalvar.textContent = 'Atualizar Pergunta';
        await carregarDadosParaEdicao(idEditando);
    }

    // Mostra/esconde o campo de alternativas baseado no tipo
    document.getElementById('tipo').addEventListener('change', function() {
        if (this.value === 'multipla_escolha' || this.value === 'checkbox') {
            containerAlternativas.style.display = 'block';
        } else {
            containerAlternativas.style.display = 'none';
        }
    });

    // Dispara o evento change ao carregar para esconder/mostrar corretamente
    document.getElementById('tipo').dispatchEvent(new Event('change'));

    // Evento de Submit
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const enunciado = document.getElementById('enunciado').value.trim();
        const tipo = document.getElementById('tipo').value;
        const obrigatoria = document.getElementById('obrigatoria').checked;
        const alternativasTexto = document.getElementById('alternativas').value;

        // --- VALIDAÇÕES (Seção 5 do Enunciado) ---
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

            // Validação de quantidade (Seção 3 do Enunciado)
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

        // Monta o objeto
        const pergunta = {
            enunciado,
            tipo,
            obrigatoria,
            alternativas,
            criadaEm: idEditando ? undefined : new Date().toISOString() // Mantém a data original se for edição
        };

        // Remove o campo criadaEm se for undefined para não bugar o json-server
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