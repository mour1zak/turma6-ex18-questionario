const API_URL_FORM = 'http://localhost:3000/formularios';
const API_URL_PERG = 'http://localhost:3000/perguntas';
const API_URL_RESPOSTA = 'http://localhost:3000/respostas';

const urlParams = new URLSearchParams(window.location.search);
const idEditando = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('form-formulario');
    const btnSalvar = form.querySelector('button[type="submit"]');
    const listaPerguntasDiv = document.getElementById('lista-perguntas');

    try {
        const resPerguntas = await fetch(API_URL_PERG);
        const perguntas = await resPerguntas.json();
        listaPerguntasDiv.innerHTML = '';
        
        if (perguntas.length === 0) {
            listaPerguntasDiv.innerHTML = '<p>Nenhuma pergunta cadastrada.</p>';
        } else {
            perguntas.forEach(p => {
                const label = document.createElement('label');
                label.style.display = 'block';
                label.style.marginBottom = '5px';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'pergunta';
                checkbox.value = p.id; // Mantém como string
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(` [ID ${p.id}] ${p.enunciado} (${p.tipo})`));
                listaPerguntasDiv.appendChild(label);
            });
        }
    } catch (error) { console.error('Erro ao carregar perguntas:', error); }

    if (idEditando) {
        btnSalvar.textContent = 'Atualizar Formulário';
        document.getElementById('titulo-pagina').textContent = 'Editar Formulário';
        try {
            const resForm = await fetch(`${API_URL_FORM}/${idEditando}`);
            const formEdit = await resForm.json();

            document.getElementById('titulo').value = formEdit.titulo;
            document.getElementById('descricao').value = formEdit.descricao || '';
            document.getElementById('status').value = formEdit.status;
            if (formEdit.dataInicio) document.getElementById('dataInicio').value = formEdit.dataInicio.split('T')[0];
            if (formEdit.dataFim) document.getElementById('dataFim').value = formEdit.dataFim.split('T')[0];

            const checkboxes = document.querySelectorAll('input[name="pergunta"]');
            checkboxes.forEach(cb => {
                // CORREÇÃO: removido parseInt, compara string com string
                if (formEdit.perguntas && formEdit.perguntas.includes(cb.value)) {
                    cb.checked = true;
                }
            });

            const temRespostas = await verificarSeFormularioTemRespostas(idEditando);
            if (formEdit.status === 'publicado' && temRespostas) restringirEdicaoFormulario();
        } catch (error) { window.location.href = 'formularios.html'; }
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const titulo = document.getElementById('titulo').value.trim();
        const descricao = document.getElementById('descricao').value.trim();
        const status = document.getElementById('status').value;
        const dataInicio = document.getElementById('dataInicio').value;
        const dataFim = document.getElementById('dataFim').value;

        const checkboxes = document.querySelectorAll('input[name="pergunta"]:checked');
        const perguntasIds = Array.from(checkboxes).map(cb => cb.value); // Mantém como string

        if (!titulo) { alert('O título é obrigatório!'); return; }
        if (perguntasIds.length < 1) { alert('Regra 1: O formulário deve conter pelo menos 1 pergunta!'); return; }

        if (idEditando) {
            const podeSalvar = await verificarRestricoesEdicao(idEditando, perguntasIds, status);
            if (!podeSalvar) return;
        }

        const formData = {
            titulo, descricao, status, perguntas: perguntasIds,
            dataInicio: dataInicio ? new Date(dataInicio).toISOString() : null,
            dataFim: dataFim ? new Date(dataFim).toISOString() : null,
            criadoEm: idEditando ? undefined : new Date().toISOString()
        };
        if (!formData.criadoEm) delete formData.criadoEm;

        try {
            const response = await fetch(idEditando ? `${API_URL_FORM}/${idEditando}` : API_URL_FORM, {
                method: idEditando ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                alert(idEditando ? 'Formulário atualizado!' : 'Formulário criado!');
                window.location.href = 'formularios.html';
            }
        } catch (error) { console.error('Erro:', error); }
    });
});

function restringirEdicaoFormulario() {
    const aviso = document.createElement('div');
    aviso.style.cssText = 'background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 5px;';
    aviso.innerHTML = '<strong>⚠️ Modo de Edição Restrita (Regra 9)</strong><br>Este formulário está PUBLICADO e já possui respostas. Você só pode editar: <strong>Título</strong> e <strong>Descrição</strong>.';
    document.getElementById('form-formulario').insertBefore(aviso, document.getElementById('form-formulario').firstChild);

    document.getElementById('status').disabled = true;
    document.getElementById('dataInicio').disabled = true;
    document.getElementById('dataFim').disabled = true;
    document.querySelectorAll('input[name="pergunta"]').forEach(cb => cb.disabled = true);
    document.querySelector('fieldset').style.opacity = '0.5';
}

async function verificarSeFormularioTemRespostas(idFormulario) {
    try {
        const res = await fetch(`${API_URL_RESPOSTA}?formularioId=${idFormulario}`);
        return (await res.json()).length > 0;
    } catch (error) { return false; }
}

async function verificarRestricoesEdicao(idFormulario, novasPerguntasIds, novoStatus) {
    try {
        const resForm = await fetch(`${API_URL_FORM}/${idFormulario}`);
        const formAtual = await resForm.json();
        if (formAtual.status === 'rascunho') return true;

        const temRespostas = await verificarSeFormularioTemRespostas(idFormulario);
        if (temRespostas) {
            const perguntasAtuais = formAtual.perguntas || [];
            const mesmasPerguntas = perguntasAtuais.length === novasPerguntasIds.length && perguntasAtuais.every(id => novasPerguntasIds.includes(id));
            if (!mesmasPerguntas) { alert('⚠️ REGRA 9: Não é possível adicionar/remover perguntas de um formulário publicado com respostas.'); return false; }
            if (novoStatus === 'rascunho') { alert('⚠️ REGRA 9: Não é possível alterar o status de um formulário publicado com respostas.'); return false; }
            
            const dataInicioAtual = formAtual.dataInicio ? formAtual.dataInicio.split('T')[0] : '';
            const dataFimAtual = formAtual.dataFim ? formAtual.dataFim.split('T')[0] : '';
            if (dataInicioAtual !== document.getElementById('dataInicio').value || dataFimAtual !== document.getElementById('dataFim').value) {
                alert('⚠️ REGRA 9: Não é possível alterar a vigência de um formulário publicado com respostas.'); return false;
            }
        }
        return true;
    } catch (error) { return false; }
}