const API_URL = 'http://localhost:3000/perguntas'

async function carregarPerguntas(){
    try{
        const response = await fetch(API_URL)
        const perguntas = await response.json()

        const tbody = document.querySelector('#tabela-perguntas tbody')
        const msgVazio = document.getElementById('mensagem-vazio')
        const tabela = document.getElementById('tabela-perguntas')

        tbody.innerHTML = ""

        if (perguntas.length === 0){
            tabela.style.display = 'none'
            msgVazio.style.display = 'block'
            return
        }
        tabela.style.display = 'table'
        msgVazio.style.display = 'none'

        perguntas.forEach(pergunta => {
            const tr = document.createElement('tr')
            tr.innerHTML = `<td>${pergunta.id}</td>
                <td>${pergunta.enunciado}</td>
                <td>${formatarTipo(pergunta.tipo)}</td>
                <td>${pergunta.obrigatoria ? 'Sim' : 'Não'}</td>
                <td>
                    <button onclick="editarPergunta(${pergunta.id})">Editar</button>
                    <button onclick="excluirPergunta(${pergunta.id})">Excluir</button>
                </td>`
            tbody.appendChild(tr)
        });
    }catch (error){
        console.error ('erro ao carregar perguntas:', error)
        alert('Erro ao conectar com o servidor. Verifique se o json-server está rodando')
    }
}

function formatarTipo(tipo){
    const tipos = {
        'multipla_escolha': 'Múltipla Escolha',
        'texto_curto': 'Texto Curto',
        'texto_longo': 'Texto Longo',
        'checkbox': 'Checkbox'
    }
    return tipos[tipo] || tipo 
}

function editarPergunta(id){
    window.location.href =  `pergunta-form.html?id=${id}`
}
async function excluirPergunta(id) {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return;

    try {
        // 1. Verificar se a pergunta já foi respondida (Regra 7)
        // O json-server permite buscar em arrays aninhados assim:
        const checkRespostas = await fetch(`http://localhost:3000/respostas?respostas.perguntaId=${id}`);
        const respostasVinculadas = await checkRespostas.json();

        if (respostasVinculadas.length > 0) {
            alert('⚠️ Esta pergunta não pode ser excluída pois já possui respostas vinculadas (Regra 7 do enunciado).');
            return;
        }

        // 2. Se não tiver respostas, exclui fisicamente
        const response = await fetch(`http://localhost:3000/perguntas/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Pergunta excluída com sucesso!');
            carregarPerguntas(); // Recarrega a tabela
        } else {
            alert('Erro ao excluir a pergunta.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão ao tentar excluir.');
    }
}
             
