const API_URL = 'http://localhost:3000/perguntas';

async function carregarPerguntas() {
    console.log('Iniciando carregamento de perguntas...');
    
    try {
        const response = await fetch(API_URL);
        console.log('Resposta da API:', response);
        
        const perguntas = await response.json();
        console.log('Perguntas recebidas:', perguntas);
        
        const tbody = document.querySelector('#tabela-perguntas tbody');
        const msgVazio = document.getElementById('mensagem-vazio');
        const tabela = document.getElementById('tabela-perguntas');

        if (!tbody) {
            console.error('Elemento tbody não encontrado!');
            return;
        }

        tbody.innerHTML = '';

        if (perguntas.length === 0) {
            console.log('Nenhuma pergunta encontrada');
            if (tabela) tabela.style.display = 'none';
            if (msgVazio) msgVazio.style.display = 'block';
            return;
        }

        if (tabela) tabela.style.display = 'table';
        if (msgVazio) msgVazio.style.display = 'none';

        perguntas.forEach(pergunta => {
            console.log('Renderizando pergunta:', pergunta);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${pergunta.id}</td>
                <td>${pergunta.enunciado}</td>
                <td>${formatarTipo(pergunta.tipo)}</td>
                <td>${pergunta.obrigatoria ? 'Sim' : 'Não'}</td>
                <td>
                    <button class="btn-editar" data-id="${pergunta.id}">Editar</button>
                    <button class="btn-excluir" data-id="${pergunta.id}">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Adicionar eventos
        adicionarEventosBotoes();

    } catch (error) {
        console.error('ERRO ao carregar perguntas:', error);
        alert('Erro ao conectar com o servidor. Verifique se o json-server está rodando!');
    }
}

function formatarTipo(tipo) {
    const tipos = {
        'multipla_escolha': 'Múltipla Escolha',
        'texto_curto': 'Texto Curto',
        'texto_longo': 'Texto Longo',
        'checkbox': 'Checkbox'
    };
    return tipos[tipo] || tipo;
}

function adicionarEventosBotoes() {
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            window.location.href = `pergunta-form.html?id=${id}`;
        });
    });

    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            await excluirPergunta(id);
        });
    });
}

async function excluirPergunta(id) {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            alert('Pergunta excluída!');
            carregarPerguntas();
        } else {
            alert('Erro ao excluir');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

document.addEventListener('DOMContentLoaded', carregarPerguntas);