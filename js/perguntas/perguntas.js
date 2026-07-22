const API_URL = 'http://localhost:3000/perguntas';

async function carregarPerguntas() {
    try {
        const response = await fetch(API_URL);
        const perguntas = await response.json();
        const tbody = document.querySelector('#tabela-perguntas tbody');
        const msgVazio = document.getElementById('mensagem-vazio');
        const tabela = document.getElementById('tabela-perguntas');

        if (!tbody) return;
        tbody.innerHTML = '';

        if (perguntas.length === 0) {
            if (tabela) tabela.style.display = 'none';
            if (msgVazio) msgVazio.style.display = 'block';
            return;
        }

        if (tabela) tabela.style.display = 'table';
        if (msgVazio) msgVazio.style.display = 'none';

        perguntas.forEach(pergunta => {
            const tr = document.createElement('tr');
            // CORREÇÃO: Tags <td> e <button> com class e data-id adicionadas corretamente
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

        adicionarEventosBotoes();
    } catch (error) {
        console.error('ERRO ao carregar perguntas:', error);
        alert('Erro ao conectar com o servidor.');
    }
}

function formatarTipo(tipo) {
    const tipos = { 'multipla_escolha': 'Múltipla Escolha', 'texto_curto': 'Texto Curto', 'texto_longo': 'Texto Longo', 'checkbox': 'Checkbox' };
    return tipos[tipo] || tipo;
}

function adicionarEventosBotoes() {
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            window.location.href = `pergunta-form.html?id=${this.getAttribute('data-id')}`;
        });
    });

    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', async function() {
            await excluirPergunta(this.getAttribute('data-id'));
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
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

document.addEventListener('DOMContentLoaded', carregarPerguntas);