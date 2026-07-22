const API_URL_FORM = 'http://localhost:3000/formularios';
const API_URL_PERG = 'http://localhost:3000/perguntas';
const API_URL_RESPOSTA = 'http://localhost:3000/respostas';

const urlParams = new URLSearchParams(window.location.search);
const idEditando = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('form-formulario');
    const btnSalvar = form.querySelector('button[type="submit"]');
    const listaPerguntasDiv = document.getElementById('lista-perguntas');
    const camposRestritos = ['status', 'dataInicio', 'dataFim'];
    const campoPerguntas = document.querySelectorAll('input[name="pergunta"]');

    // 1. Carregar perguntas para gerar os checkboxes
    try {
        const resPerguntas = await fetch(API_URL_PERG);
        const perguntas = await resPerguntas.json();

        listaPerguntasDiv.innerHTML = '';
        if (perguntas.length === 0) {
            listaPerguntasDiv.innerHTML = '<p>Nenhuma pergunta cadastrada. Cadastre perguntas primeiro!</p>';
        } else {
            perguntas.forEach(p => {
                const label = document.createElement('label');
                label.style.display = 'block';
                label.style.marginBottom = '5px';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'pergunta';
                checkbox.value = p.id;
                
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(` [ID ${p.id}] ${p.enunciado} (${p.tipo})`));
                listaPerguntasDiv.appendChild(label);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar perguntas:', error);
    }

    // 2. Se for edição, carregar dados do formulário e aplicar Regra 9
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

            // Marcar as checkboxes das perguntas já selecionadas
            const checkboxes = document.querySelectorAll('input[name="pergunta"]');
            checkboxes.forEach(cb => {
                if (formEdit.perguntas && formEdit.perguntas.includes(cb.value)) {
                    cb.checked = true;
                }
            });

            // 🔴 REGRA 9: Verificar se precisa restringir edição
            const temRespostas = await verificarSeFormularioTemRespostas(idEditando);
            
            if (formEdit.status === 'publicado' && temRespostas) {
                restringirEdicaoFormulario();
            }

        } catch (error) {
            alert('Erro ao carregar dados do formulário.');
            window.location.href = 'formularios.html';
        }
    }

    // 3. Evento de Submit
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const titulo = document.getElementById('titulo').value.trim();
        const descricao = document.getElementById('descricao').value.trim();
        const status = document.getElementById('status').value;
        const dataInicio = document.getElementById('dataInicio').value;
        const dataFim = document.getElementById('dataFim').value;

        // Coletar IDs das perguntas selecionadas
        const checkboxes = document.querySelectorAll('input[name="pergunta"]:checked');
        const perguntasIds = Array.from(checkboxes).map(cb => cb.value);

        // --- VALIDAÇÕES BÁSICAS ---
        if (!titulo) {
            alert('O título é obrigatório!');
            return;
        }
        if (perguntasIds.length < 1) {
            alert('Regra 1: O formulário deve conter pelo menos 1 pergunta!');
            return;
        }

        // 🔴 REGRA 9: Verificar restrições de edição
        if (idEditando) {
            const podeSalvar = await verificarRestricoesEdicao(idEditando, perguntasIds, status);
            if (!podeSalvar) {
                return;
            }
        }

        // Montar objeto
        const formData = {
            titulo,
            descricao,
            status,
            perguntas: perguntasIds,
            dataInicio: dataInicio ? new Date(dataInicio).toISOString() : null,
            dataFim: dataFim ? new Date(dataFim).toISOString() : null,
            criadoEm: idEditando ? undefined : new Date().toISOString()
        };

        if (!formData.criadoEm) delete formData.criadoEm;

        try {
            let response;
            if (idEditando) {
                response = await fetch(`${API_URL_FORM}/${idEditando}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            } else {
                response = await fetch(API_URL_FORM, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            }

            if (response.ok) {
                alert(idEditando ? 'Formulário atualizado!' : 'Formulário criado com sucesso!');
                window.location.href = 'formularios.html';
            } else {
                alert('Erro ao salvar o formulário.');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão.');
        }
    });

    // 🔴 REGRA 9: Função para restringir campos de edição
    function restringirEdicaoFormulario() {
        const aviso = document.createElement('div');
        aviso.style.backgroundColor = '#fff3cd';
        aviso.style.border = '1px solid #ffc107';
        aviso.style.padding = '15px';
        aviso.style.marginBottom = '20px';
        aviso.style.borderRadius = '5px';
        aviso.innerHTML = `
            <strong>️ Modo de Edição Restrita (Regra 9)</strong><br>
            Este formulário está PUBLICADO e já possui respostas. 
            Você só pode editar: <strong>Título</strong> e <strong>Descrição</strong>.
        `;
        form.insertBefore(aviso, form.firstChild);

        // Desabilitar campos restritos
        document.getElementById('status').disabled = true;
        document.getElementById('dataInicio').disabled = true;
        document.getElementById('dataFim').disabled = true;

        // Desabilitar checkboxes de perguntas
        const checkboxes = document.querySelectorAll('input[name="pergunta"]');
        checkboxes.forEach(cb => {
            cb.disabled = true;
        });

        // Adicionar aviso na lista de perguntas
        const fieldset = document.querySelector('fieldset');
        fieldset.style.opacity = '0.5';
        fieldset.style.pointerEvents = 'none';
    }
});

// 🔴 REGRA 9: Verificar se formulário tem respostas
async function verificarSeFormularioTemRespostas(idFormulario) {
    try {
        const resRespostas = await fetch(`${API_URL_RESPOSTA}?formularioId=${idFormulario}`);
        const respostas = await resRespostas.json();
        return respostas.length > 0;
    } catch (error) {
        console.error('Erro ao verificar respostas:', error);
        return false;
    }
}

// 🔴 REGRA 9: Verificar restrições de edição
async function verificarRestricoesEdicao(idFormulario, novasPerguntasIds, novoStatus) {
    try {
        // Buscar o formulário atual
        const resForm = await fetch(`${API_URL_FORM}/${idFormulario}`);
        const formAtual = await resForm.json();

        // Se estava em rascunho, pode editar tudo
        if (formAtual.status === 'rascunho') {
            return true;
        }

        // Se está publicado, verificar se tem respostas
        const temRespostas = await verificarSeFormularioTemRespostas(idFormulario);
        
        if (temRespostas) {
            // Verificar se está tentando mudar as perguntas
            const perguntasAtuais = formAtual.perguntas || [];
            const mesmasPerguntas = 
                perguntasAtuais.length === novasPerguntasIds.length &&
                perguntasAtuais.every(id => novasPerguntasIds.includes(id));

            if (!mesmasPerguntas) {
                alert('⚠️ REGRA 9: Não é possível adicionar/remover perguntas de um formulário publicado que já tem respostas. Você pode editar apenas título e descrição.');
                return false;
            }

            // Verificar se está tentando mudar status para rascunho
            if (novoStatus === 'rascunho') {
                alert('⚠️ REGRA 9: Não é possível alterar o status de um formulário publicado que já tem respostas.');
                return false;
            }

            // Verificar se está tentando mudar datas
            const dataInicioAtual = formAtual.dataInicio ? formAtual.dataInicio.split('T')[0] : '';
            const dataFimAtual = formAtual.dataFim ? formAtual.dataFim.split('T')[0] : '';
            const dataInicioNova = document.getElementById('dataInicio').value;
            const dataFimNova = document.getElementById('dataFim').value;

            if (dataInicioAtual !== dataInicioNova || dataFimAtual !== dataFimNova) {
                alert('️ REGRA 9: Não é possível alterar o período de vigência de um formulário publicado que já tem respostas.');
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Erro ao verificar restrições:', error);
        alert('Erro ao verificar restrições de edição.');
        return false;
    }
}