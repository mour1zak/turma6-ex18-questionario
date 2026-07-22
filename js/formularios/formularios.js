// URL da API
const API_URL = 'http://localhost:3000/formularios';

// Função principal de carregamento
async function carregarFormularios() {
    try {
        const response = await fetch(API_URL);
        const formularios = await response.json();
        
        const tbody = document.querySelector('#tabela-formularios tbody');
        const msgVazio = document.getElementById('mensagem-vazio');
        const tabela = document.getElementById('tabela-formularios');

        if (!tbody || !tabela) {
            console.error('Elementos da tabela não encontrados!');
            return;
        }

        tbody.innerHTML = '';

        if (formularios.length === 0) {
            tabela.style.display = 'none';
            if (msgVazio) msgVazio.style.display = 'block';
            return;
        }

        tabela.style.display = 'table';
        if (msgVazio) msgVazio.style.display = 'none';

        formularios.forEach(form => {
            const tr = document.createElement('tr');
            
            const dataInicio = form.dataInicio ? new Date(form.dataInicio).toLocaleDateString('pt-BR') : '-';
            const dataFim = form.dataFim ? new Date(form.dataFim).toLocaleDateString('pt-BR') : '-';
            const vigencia = `${dataInicio} até ${dataFim}`;

            tr.innerHTML = `
                <td>${form.id}</td>
                <td>${form.titulo}</td>
                <td><strong>${form.status ? form.status.toUpperCase() : 'SEM STATUS'}</strong></td>
                <td>${vigencia}</td>
                <td>
                    <button class="btn-editar" data-id="${form.id}">Editar</button>
                    <button class="btn-excluir" data-id="${form.id}">Excluir</button>
                    <button class="btn-respostas" data-id="${form.id}">Respostas</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Adicionar eventos aos botões (abordagem mais segura que onclick)
        adicionarEventosBotoes();

    } catch (error) {
        console.error('Erro ao carregar formulários:', error);
        alert('Erro ao conectar com o servidor. Verifique se o json-server está rodando!');
    }
}

// Função para adicionar eventos aos botões (MELHOR ABORDAGEM)
function adicionarEventosBotoes() {
    // Botões de Editar
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            editarFormulario(id);
        });
    });

    // Botões de Excluir
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            excluirFormulario(id);
        });
    });

    // Botões de Respostas
    document.querySelectorAll('.btn-respostas').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            verRespostas(id);
        });
    });
}

// Funções de ação (agora usando addEventListener em vez de onclick)
function editarFormulario(id) {
    console.log('Editando formulário:', id);
    window.location.href = `formulario-form.html?id=${id}`;
}

async function excluirFormulario(id) {
    console.log('Excluindo formulário:', id);
    if (!confirm('Tem certeza que deseja excluir este formulário?')) return;

    try {
        const checkRespostas = await fetch(`http://localhost:3000/respostas?formularioId=${id}`);
        const respostasVinculadas = await checkRespostas.json();

        if (respostasVinculadas.length > 0) {
            alert('⚠️ Este formulário não pode ser excluído pois já possui respostas vinculadas (Regra 7).');
            return;
        }

        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

        if (response.ok) {
            alert('Formulário excluído com sucesso!');
            carregarFormularios();
        } else {
            alert('Erro ao excluir o formulário.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão ao tentar excluir.');
    }
}

function verRespostas(id) {
    console.log('Ver respostas:', id);
    alert(`Ver respostas do formulário ${id} - Em implementação!`);
}

// Iniciar quando a página carregar
document.addEventListener('DOMContentLoaded', carregarFormularios);