const API_URL_FORM = 'http://localhost:3000/formularios';
const API_URL_PERG = 'http://localhost:3000/perguntas';

const urlParams = new URLSearchParams(window.location.search);
const idEditando = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('form-formulario');
    const btnSalvar = form.querySelector('button[type="submit"]');
    const listaPerguntasDiv = document.getElementById('lista-perguntas');

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

    // 2. Se for edição, carregar dados do formulário
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
                if (formEdit.perguntas.includes(parseInt(cb.value))) {
                    cb.checked = true;
                }
            });

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
        const perguntasIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

        // --- VALIDAÇÕES BÁSICAS ---
        if (!titulo) {
            alert('O título é obrigatório!');
            return;
        }
        if (perguntasIds.length < 1) {
            alert('Regra 1: O formulário deve conter pelo menos 1 pergunta!');
            return;
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
});