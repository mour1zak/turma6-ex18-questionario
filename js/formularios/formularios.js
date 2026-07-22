const API_URL = 'http://localhost:3000/formularios';
const API_URL_RESPOSTAS = 'http://localhost:3000/respostas';

// Função principal para carregar e exibir a lista de formulários
async function carregarFormularios() {
    try {
        const response = await fetch(API_URL);
        const formularios = await response.json();
        
        const tbody = document.querySelector('#tabela-formularios tbody');
        const msgVazio = document.getElementById('mensagem-vazio');
        const tabela = document.getElementById('tabela-formularios');

        // Verifica se os elementos existem na página
        if (!tbody || !tabela) {
            console.error('Elementos da tabela não encontrados no HTML!');
            return;
        }

        tbody.innerHTML = ''; // Limpa a tabela antes de renderizar

        if (formularios.length === 0) {
            tabela.style.display = 'none';
            if (msgVazio) msgVazio.style.display = 'block';
            return;
        }

        tabela.style.display = 'table';
        if (msgVazio) msgVazio.style.display = 'none';

        // Renderiza cada formulário na tabela
        formularios.forEach(form => {
            const tr = document.createElement('tr');
            
            const dataInicio = form.dataInicio ? new Date(form.dataInicio).toLocaleDateString('pt-BR') : '-';
            const dataFim = form.dataFim ? new Date(form.dataFim).toLocaleDateString('pt-BR') : '-';
            const vigencia = `${dataInicio} até ${dataFim}`;

            // O segredo está aqui: data-id="${form.id}" guarda o ID no botão
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

        // Chama a função que ativa os cliques automaticamente após criar os botões
        ativarBotoes();

    } catch (error) {
        console.error('Erro ao carregar formulários:', error);
        alert('Erro ao conectar com o servidor. Verifique se o json-server está rodando!');
    }
}

// Função que faz a mágica do clique automático acontecer
function ativarBotoes() {
    // 1. Botão de RESPOSTAS (Redirecionamento Automático)
    document.querySelectorAll('.btn-respostas').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); // Impede qualquer comportamento padrão estranho
            const idDoFormulario = this.getAttribute('data-id'); // Pega o ID automaticamente
            
            console.log('✅ Redirecionando automaticamente para respostas do formulário ID:', idDoFormulario);
            
            // Muda a URL e vai para a página sozinho
            window.location.href = `respostas.html?id=${idDoFormulario}`;
        });
    });

    // 2. Botão de EDITAR (Também automático)
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const idDoFormulario = this.getAttribute('data-id');
            console.log('✅ Redirecionando para editar formulário ID:', idDoFormulario);
            window.location.href = `formulario-form.html?id=${idDoFormulario}`;
        });
    });

    // 3. Botão de EXCLUIR
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const idDoFormulario = this.getAttribute('data-id');
            console.log('✅ Solicitando exclusão do formulário ID:', idDoFormulario);
            excluirFormulario(idDoFormulario);
        });
    });
}

// Função para excluir o formulário (com Regra 7: não excluir se tiver respostas)
async function excluirFormulario(id) {
    if (!confirm('Tem certeza que deseja excluir este formulário?')) return;

    try {
        // Regra 7: Verificar se já existem respostas vinculadas a este formulário
        const checkRespostas = await fetch(`${API_URL_RESPOSTAS}?formularioId=${id}`);
        const respostasVinculadas = await checkRespostas.json();

        if (respostasVinculadas.length > 0) {
            alert('⚠️ REGRA 7: Este formulário não pode ser excluído pois já possui respostas vinculadas. Você deve alterá-lo para o status "encerrado".');
            return; // Interrompe a exclusão
        }

        // Se não tiver respostas, procede com a exclusão física (DELETE)
        const response = await fetch(`${API_URL}/${id}`, { 
            method: 'DELETE' 
        });

        if (response.ok) {
            alert('Formulário excluído com sucesso!');
            carregarFormularios(); // Recarrega a tabela para atualizar a tela
        } else {
            alert('Erro ao excluir o formulário.');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro de conexão ao tentar excluir.');
    }
}

// Inicia o carregamento assim que a página estiver pronta
document.addEventListener('DOMContentLoaded', carregarFormularios);