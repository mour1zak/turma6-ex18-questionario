const API_URL = 'http://localhost:3000/perguntas';
const API_URL_FORM = 'http://localhost:3000/formularios';
const API_URL_RESPOSTA = 'http://localhost:3000/respostas';

const urlParams = new URLSearchParams(window.location.search);
const idEditando = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('form-pergunta');
    const btnSalvar = form.querySelector('button[type="submit"]');
    const containerAlternativas = document.getElementById('container-alternativas');
    const tipoSelect = document.getElementById('tipo');
    const alternativasTextarea = document.getElementById('alternativas');

    if (idEditando) {
        btnSalvar.textContent = 'Atualizar Pergunta';
        await carregarDadosParaEdicao(idEditando);
    }

    tipoSelect.addEventListener('change', function() {
        containerAlternativas.style.display = (this.value === 'multipla_escolha' || this.value === 'checkbox') ? 'block' : 'none';
    });
    tipoSelect.dispatchEvent(new Event('change'));

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const enunciado = document.getElementById('enunciado').value.trim();
        const tipo = tipoSelect.value;
        const obrigatoria = document.getElementById('obrigatoria').checked;
        const alternativasTexto = alternativasTextarea.value;

        // Validação Seção 5
        if (!enunciado) { alert('Enunciado obrigatório.'); return; }

        let alternativas = [];
        if (tipo === 'multipla_escolha' || tipo === 'checkbox') {
            // CORREÇÃO: split('\n') em vez de split('n')
            alternativas = alternativasTexto.split('\n').map(alt => alt.trim()).filter(alt => alt !== '');
            
            // Validação duplicidade
            if (new Set(alternativas).size !== alternativas.length) {
                alert('Alternativas não podem ser repetidas.');
                return;
            }

            // Validação Seção 3: quantidade
            if (tipo === 'multipla_escolha') {
                if (alternativas.length < 2 || alternativas.length > 10) {
                    alert('Múltipla escolha: 2 a 10 alternativas.');
                    return;
                }
            } else if (tipo === 'checkbox') {
                if (alternativas.length < 3 || alternativas.length > 15) {
                    alert('Checkbox: 3 a 15 alternativas.');
                    return;
                }
            }
        }

        // Regra 8: Verificar se pode alterar
        if (idEditando) {
            const podeAlterar = await verificarRegra8(idEditando, tipo, alternativas);
            if (!podeAlterar) return;
        }

        const pergunta = {
            enunciado,
            tipo,
            obrigatoria,
            alternativas,
            criadaEm: idEditando ? undefined : new Date().toISOString()
        };
        if (!pergunta.criadaEm) delete pergunta.criadaEm;

        try {
            const response = await fetch(idEditando ? `${API_URL}/${idEditando}` : API_URL, {
                method: idEditando ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pergunta)
            });

            if (response.ok) {
                alert(idEditando ? 'Pergunta atualizada!' : 'Pergunta cadastrada!');
                window.location.href = 'perguntas.html';
            }
        } catch (error) {
            console.error('Erro:', error);
        }
    });
});

async function verificarRegra8(idPergunta, novoTipo, novasAlternativas) {
    try {
        const resForms = await fetch(`${API_URL_FORM}?status=publicado`);
        const formsPublicados = await resForms.json();
        
        const formComPergunta = formsPublicados.find(f => 
            f.perguntas && f.perguntas.includes(idPergunta)
        );

        if (!formComPergunta) return true;

        const resRespostas = await fetch(`${API_URL_RESPOSTA}?formularioId=${formComPergunta.id}`);
        const respostas = await resRespostas.json();
        
        if (respostas.length === 0) return true;

        const resPergunta = await fetch(`${API_URL}/${idPergunta}`);
        const perguntaAtual = await resPergunta.json();

        // Regra 8: Bloquear mudança de tipo
        if (perguntaAtual.tipo !== novoTipo) {
            alert('️ REGRA 8: Não pode alterar tipo de pergunta já respondida.');
            return false;
        }

        // Regra 8: Bloquear mudança de alternativas
        if (novoTipo === 'multipla_escolha' || novoTipo === 'checkbox') {
            const atuais = perguntaAtual.alternativas || [];
            const mesmas = atuais.length === novasAlternativas.length && 
                          atuais.every((alt, i) => alt === novasAlternativas[i]);
            
            if (!mesmas) {
                alert('⚠️ REGRA 8: Não pode alterar alternativas de pergunta já respondida.');
                return false;
            }
        }
        return true;
    } catch (error) {
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
        window.location.href = 'perguntas.html';
    }
}