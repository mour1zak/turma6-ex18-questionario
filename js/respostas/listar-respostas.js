const API_URL_FORM = 'http://localhost:3000/formularios';
const API_URL_PERG = 'http://localhost:3000/perguntas';
const API_URL_RESPOSTA = 'http://localhost:3000/respostas';

document.addEventListener('DOMContentLoaded', async () => {
    console.log(' Página de respostas carregada');
    
    const params = new URLSearchParams(window.location.search);
    const formularioId = params.get('id');

    if (formularioId) {
        // Tem ID: mostrar respostas detalhadas
        console.log('📋 Mostrando respostas do formulário:', formularioId);
        document.getElementById('visao-geral').style.display = 'none';
        document.getElementById('visao-detalhada').style.display = 'block';
        await carregarRespostasDetalhadas(formularioId);
    } else {
        // Sem ID: mostrar lista geral
        console.log('📋 Mostrando lista geral de formulários');
        document.getElementById('visao-geral').style.display = 'block';
        document.getElementById('visao-detalhada').style.display = 'none';
        await carregarListaGeral();
    }
});

// Função para carregar a lista geral de formulários
async function carregarListaGeral() {
    const listaDiv = document.getElementById('lista-formularios');
    const resumoEl = document.getElementById('resumo-total');

    try {
        // Buscar todos os formulários
        const resForm = await fetch(API_URL_FORM);
        const formularios = await resForm.json();

        // Buscar todas as respostas
        const resRespostas = await fetch(API_URL_RESPOSTA);
        const todasRespostas = await resRespostas.json();

        const totalFormularios = formularios.length;
        const totalRespostas = todasRespostas.length;

        resumoEl.textContent = `Total: ${totalFormularios} formulário(s) | ${totalRespostas} resposta(s) recebida(s)`;

        if (formularios.length === 0) {
            listaDiv.innerHTML = `
                <div style="padding: 30px; text-align: center; background-color: #f8f9fa; border-radius: 8px;">
                    <p style="color: #6c757d;">📭 Nenhum formulário cadastrado ainda.</p>
                    <a href="formularios.html" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background-color: #EC0000; color: white; text-decoration: none; border-radius: 4px;">
                        Criar primeiro formulário
                    </a>
                </div>
            `;
            return;
        }

        let html = '<div style="display: grid; gap: 20px; margin-top: 20px;">';

        formularios.forEach(form => {
            // Contar respostas deste formulário
            const respostasDoForm = todasRespostas.filter(r => r.formularioId == form.id);
            const qtdRespostas = respostasDoForm.length;

            const dataInicio = form.dataInicio ? new Date(form.dataInicio).toLocaleDateString('pt-BR') : '-';
            const dataFim = form.dataFim ? new Date(form.dataFim).toLocaleDateString('pt-BR') : '-';

            html += `
                <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #EC0000;">
                    <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 15px;">
                        <div style="flex: 1; min-width: 250px;">
                            <h3 style="margin: 0 0 10px 0; color: #333;">${form.titulo}</h3>
                            <p style="margin: 0; color: #6c757d; font-size: 0.9rem;">
                                <strong>Status:</strong> ${form.status ? form.status.toUpperCase() : 'N/A'} | 
                                <strong>Vigência:</strong> ${dataInicio} até ${dataFim}
                            </p>
                            <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 0.9rem;">
                                <strong>Perguntas:</strong> ${form.perguntas ? form.perguntas.length : 0}
                            </p>
                        </div>
                        <div style="text-align: right;">
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                                <div style="font-size: 2rem; font-weight: bold; color: #EC0000;">${qtdRespostas}</div>
                                <div style="font-size: 0.85rem; color: #6c757d;">resposta(s)</div>
                            </div>
                            <button onclick="verDetalhes('${form.id}')" style="padding: 8px 16px; background-color: #EC0000; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
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
        console.error('Erro ao carregar lista geral:', error);
        listaDiv.innerHTML = `
            <div style="padding: 20px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; color: #721c24;">
                <h3>❌ Erro ao carregar formulários</h3>
                <p>${error.message}</p>
                <p style="margin-top: 10px;">Verifique se o JSON Server está rodando (npm start)</p>
            </div>
        `;
    }
}

// Função para carregar respostas detalhadas de um formulário específico
async function carregarRespostasDetalhadas(formularioId) {
    const container = document.getElementById('container-respostas');
    const tituloEl = document.getElementById('titulo-formulario');
    const totalEl = document.getElementById('total-respostas');

    try {
        // Buscar o formulário
        const resForm = await fetch(`${API_URL_FORM}/${formularioId}`);
        if (!resForm.ok) throw new Error('Formulário não encontrado');
        const form = await resForm.json();

        tituloEl.textContent = `Respostas de: ${form.titulo}`;

        // Buscar todas as perguntas
        const resPergs = await fetch(API_URL_PERG);
        const todasPerguntas = await resPergs.json();
        const perguntasDoForm = todasPerguntas.filter(p => form.perguntas && form.perguntas.includes(p.id));

        // Buscar as respostas
        const resRespostas = await fetch(`${API_URL_RESPOSTA}?formularioId=${formularioId}`);
        const respostas = await resRespostas.json();

        totalEl.textContent = `Total de respostas recebidas: ${respostas.length}`;

        if (respostas.length === 0) {
            container.innerHTML = `
                <div style="padding: 30px; text-align: center; background-color: #f8f9fa; border-radius: 8px; margin-top: 20px;">
                    <p style="color: #6c757d; font-size: 1.1rem;">📭 Nenhuma resposta recebida para este formulário ainda.</p>
                </div>
            `;
            return;
        }

        // Renderizar tabela
        let html = `
            <table class="tabela-respostas" style="width: 100%; border-collapse: collapse; margin-top: 20px; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background-color: #EC0000; color: white;">
                        <th style="padding: 15px; text-align: left;">Nome</th>
                        <th style="padding: 15px; text-align: left;">E-mail</th>
                        <th style="padding: 15px; text-align: left;">Enviado em</th>
                        <th style="padding: 15px; text-align: left;">Respostas</th>
                    </tr>
                </thead>
                <tbody>
        `;

        respostas.forEach(resp => {
            const dataEnvio = resp.enviadoEm ? new Date(resp.enviadoEm).toLocaleString('pt-BR') : 'N/A';
            
            let detalhesRespostas = '<ul style="margin: 0; padding-left: 20px; list-style: none;">';
            perguntasDoForm.forEach(perg => {
                const respostaDada = resp.respostas && resp.respostas.find(r => r.perguntaId == perg.id);
                let valorExibido = '<em style="color: #999;">Sem resposta</em>';
                if (respostaDada && respostaDada.valor) {
                    valorExibido = Array.isArray(respostaDada.valor) ? respostaDada.valor.join(', ') : respostaDada.valor;
                }
                detalhesRespostas += `<li style="margin-bottom: 8px; padding: 8px; background-color: #f8f9fa; border-radius: 4px;"><strong style="color: #EC0000;">${perg.enunciado}:</strong><br><span style="margin-left: 10px;">${valorExibido}</span></li>`;
            });
            detalhesRespostas += '</ul>';

            html += `
                <tr style="border-bottom: 1px solid #dee2e6;">
                    <td style="padding: 15px; font-weight: 600;">${resp.nome}</td>
                    <td style="padding: 15px; color: #6c757d;">${resp.email}</td>
                    <td style="padding: 15px; color: #6c757d; font-size: 0.9rem;">${dataEnvio}</td>
                    <td style="padding: 15px;">${detalhesRespostas}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar respostas detalhadas:', error);
        container.innerHTML = `
            <div style="padding: 20px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; color: #721c24;">
                <h3>❌ Erro ao carregar respostas</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Função para ver detalhes de um formulário específico
function verDetalhes(id) {
    console.log(' Ver detalhes do formulário:', id);
    window.location.href = `respostas.html?id=${id}`;
}

// Função para voltar para a lista geral
function voltarParaLista() {
    console.log('← Voltando para lista geral');
    window.location.href = 'respostas.html';
}