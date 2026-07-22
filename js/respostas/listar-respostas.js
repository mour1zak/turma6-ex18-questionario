const API_URL_FORM = 'http://localhost:3000/formularios';
const API_URL_PERG = 'http://localhost:3000/perguntas';
const API_URL_RESPOSTA = 'http://localhost:3000/respostas';

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const formularioId = params.get('id');

    if (formularioId) {
        document.getElementById('visao-geral').style.display = 'none';
        document.getElementById('visao-detalhada').style.display = 'block';
        await carregarRespostasDetalhadas(formularioId);
    } else {
        document.getElementById('visao-geral').style.display = 'block';
        document.getElementById('visao-detalhada').style.display = 'none';
        await carregarListaGeral();
    }
});

async function carregarListaGeral() {
    const listaDiv = document.getElementById('lista-formularios');
    const resumoEl = document.getElementById('resumo-total');

    try {
        const resForm = await fetch(API_URL_FORM);
        const formularios = await resForm.json();
        const resRespostas = await fetch(API_URL_RESPOSTA);
        const todasRespostas = await resRespostas.json();

        resumoEl.textContent = `Total: ${formularios.length} formulário(s) | ${todasRespostas.length} resposta(s) recebida(s)`;

        if (formularios.length === 0) {
            listaDiv.innerHTML = '<p style="text-align: center; color: #6c757d;">📭 Nenhum formulário cadastrado ainda.</p>';
            return;
        }

        let html = '<div style="display: grid; gap: 20px; margin-top: 20px;">';
        formularios.forEach(form => {
            const qtdRespostas = todasRespostas.filter(r => r.formularioId == form.id).length;
            const dataInicio = form.dataInicio ? new Date(form.dataInicio).toLocaleDateString('pt-BR') : '-';
            const dataFim = form.dataFim ? new Date(form.dataFim).toLocaleDateString('pt-BR') : '-';

            html += `
                <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #EC0000;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <h3 style="margin: 0 0 5px 0;">${form.titulo}</h3>
                            <p style="margin: 0; color: #6c757d; font-size: 0.9rem;">Status: ${form.status.toUpperCase()} | Vigência: ${dataInicio} até ${dataFim}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #EC0000;">${qtdRespostas} resposta(s)</div>
                            <button onclick="verDetalhes('${form.id}')" style="margin-top: 10px; padding: 8px 16px; background-color: #EC0000; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Ver Respostas →
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        listaDiv.innerHTML = html;
    } catch (error) {
        listaDiv.innerHTML = `<p style="color: red;">Erro ao carregar: ${error.message}</p>`;
    }
}

async function carregarRespostasDetalhadas(formularioId) {
    const container = document.getElementById('container-respostas');
    const tituloEl = document.getElementById('titulo-formulario');
    const totalEl = document.getElementById('total-respostas');

    try {
        const resForm = await fetch(`${API_URL_FORM}/${formularioId}`);
        const form = await resForm.json();
        tituloEl.textContent = `Respostas de: ${form.titulo}`;

        const resPergs = await fetch(API_URL_PERG);
        const todasPerguntas = await resPergs.json();
        const perguntasDoForm = todasPerguntas.filter(p => form.perguntas && form.perguntas.includes(p.id));

        const resRespostas = await fetch(`${API_URL_RESPOSTA}?formularioId=${formularioId}`);
        const respostas = await resRespostas.json();
        totalEl.textContent = `Total de respostas recebidas: ${respostas.length}`;

        if (respostas.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">📭 Nenhuma resposta recebida ainda.</p>';
            return;
        }

        let html = `<table style="width: 100%; border-collapse: collapse; margin-top: 20px; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <thead><tr style="background-color: #EC0000; color: white;">
                <th style="padding: 12px; text-align: left;">Nome</th>
                <th style="padding: 12px; text-align: left;">E-mail</th>
                <th style="padding: 12px; text-align: left;">Enviado em</th>
                <th style="padding: 12px; text-align: left;">Respostas</th>
            </tr></thead><tbody>`;

        respostas.forEach(resp => {
            const dataEnvio = resp.enviadoEm ? new Date(resp.enviadoEm).toLocaleString('pt-BR') : 'N/A';
            let detalhes = '<ul style="margin: 0; padding-left: 20px; list-style: none;">';
            
            perguntasDoForm.forEach(perg => {
                const respostaDada = resp.respostas && resp.respostas.find(r => r.perguntaId == perg.id);
                let valor = '<em style="color: #999;">Sem resposta</em>';
                if (respostaDada && respostaDada.valor) {
                    valor = Array.isArray(respostaDada.valor) ? respostaDada.valor.join(', ') : respostaDada.valor;
                }
                detalhes += `<li style="margin-bottom: 8px;"><strong style="color: #EC0000;">${perg.enunciado}:</strong> <span style="margin-left: 5px;">${valor}</span></li>`;
            });
            detalhes += '</ul>';

            html += `<tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 12px;">${resp.nome}</td>
                <td style="padding: 12px;">${resp.email}</td>
                <td style="padding: 12px; font-size: 0.9rem;">${dataEnvio}</td>
                <td style="padding: 12px;">${detalhes}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Erro: ${error.message}</p>`;
    }
}

function verDetalhes(id) {
    window.location.href = `respostas.html?id=${id}`;
}

function voltarParaLista() {
    window.location.href = 'respostas.html';
}