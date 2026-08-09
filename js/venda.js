// ==========================================
// CONFIGURAÇÕES E ESTADO DA VENDA (SISTEMA UNIFICADO)
// ==========================================
const PIN_CORRETO = '311204';
const TEMPO_INATIVIDADE_MINUTOS = 10;
const LIMITE_INATIVIDADE_MS = TEMPO_INATIVIDADE_MINUTOS * 60 * 1000;

let vendas = [];
let estoqueProdutos = [];
let carrinho = [];
let sistemaArquivoHandle = null;

const pinScreen = document.getElementById('pin-screen');
const vendaContent = document.getElementById('venda-content');
const pinInput = document.getElementById('pin-input');
const btnAcessar = document.getElementById('btn-acessar');
const errorMsg = document.getElementById('pin-error');

let timerInatividade;

// ==========================================
// 1. PIN E INATIVIDADE
// ==========================================
function validarPin() {
    if (pinInput.value === PIN_CORRETO) {
        pinScreen.classList.add('hidden');
        vendaContent.classList.remove('hidden');
        pinInput.value = '';
        errorMsg.style.display = 'none';
        iniciarTimerInatividade();
        
        carregarDadosIniciais();
    } else {
        errorMsg.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
    }
}

function bloquearTela() {
    pinScreen.classList.remove('hidden');
    vendaContent.classList.add('hidden');
    pinInput.focus();
    clearTimeout(timerInatividade);
}

function iniciarTimerInatividade() {
    clearTimeout(timerInatividade);
    timerInatividade = setTimeout(bloquearTela, LIMITE_INATIVIDADE_MS);
}

function resetarTimer() {
    if (!vendaContent.classList.contains('hidden')) {
        iniciarTimerInatividade();
    }
}

btnAcessar.addEventListener('click', validarPin);
pinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') validarPin(); });

window.addEventListener('mousemove', resetarTimer);
window.addEventListener('keypress', resetarTimer);
window.addEventListener('click', resetarTimer);
window.addEventListener('scroll', resetarTimer);


// ==========================================
// 2. CARREGAMENTO DE DADOS UNIFICADOS
// ==========================================
function carregarDadosIniciais() {
    const dadosSalvos = localStorage.getItem('pdv_sistema_katec');
    if (dadosSalvos) {
        try {
            const dados = JSON.parse(dadosSalvos);
            estoqueProdutos = dados.produtos || [];
            vendas = dados.vendas || [];
        } catch (e) {
            estoqueProdutos = [];
            vendas = [];
        }
    } else {
        const estoqueAntigo = localStorage.getItem('pdv_produtos_katec');
        const vendasAntigas = localStorage.getItem('pdv_vendas_katec');
        estoqueProdutos = estoqueAntigo ? JSON.parse(estoqueAntigo) : [];
        vendas = vendasAntigas ? JSON.parse(vendasAntigas) : [];
    }
    
    renderizarTabelaVendas();
}


// ==========================================
// 3. PERSISTÊNCIA UNIFICADA EM sistema.json
// ==========================================
async function salvarSistemaNoComputador() {
    const dadosSistema = { produtos: estoqueProdutos, vendas: vendas };
    localStorage.setItem('pdv_sistema_katec', JSON.stringify(dadosSistema));
    localStorage.setItem('pdv_produtos_katec', JSON.stringify(estoqueProdutos));
    localStorage.setItem('pdv_vendas_katec', JSON.stringify(vendas));

    const savedHandle = localStorage.getItem('pdv_sistema_file_handle');
    if (savedHandle && !sistemaArquivoHandle) {
        try {
            sistemaArquivoHandle = JSON.parse(savedHandle);
        } catch(e) {}
    }

    if (sistemaArquivoHandle) {
        try {
            const writable = await sistemaArquivoHandle.createWritable();
            await writable.write(JSON.stringify(dadosSistema, null, 2));
            await writable.close();
            renderizarTabelaVendas();
            return;
        } catch (err) {
            console.log("Erro ao gravar no arquivo, solicitando local...");
        }
    }

    if ('showSaveFilePicker' in window) {
        try {
            const options = {
                suggestedName: 'sistema.json',
                types: [{
                    description: 'Arquivo JSON do Sistema',
                    accept: { 'application/json': ['.json'] },
                }],
            };
            sistemaArquivoHandle = await window.showSaveFilePicker(options);
            localStorage.setItem('pdv_sistema_file_handle', JSON.stringify(sistemaArquivoHandle));

            const writable = await sistemaArquivoHandle.createWritable();
            await writable.write(JSON.stringify(dadosSistema, null, 2));
            await writable.close();
        } catch (err) {
            console.log("Salvamento cancelado.");
        }
    } else {
        baixarJSONSistemaAutomatico();
    }
    
    renderizarTabelaVendas();
}

function baixarJSONSistemaAutomatico() {
    const dadosSistema = { produtos: estoqueProdutos, vendas: vendas };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosSistema, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "sistema.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

async function carregarSistemaManual() {
    resetarTimer();
    if ('showOpenFilePicker' in window) {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'Arquivos JSON', accept: { 'application/json': ['.json'] } }]
            });
            sistemaArquivoHandle = handle;
            localStorage.setItem('pdv_sistema_file_handle', JSON.stringify(sistemaArquivoHandle));
            
            const file = await handle.getFile();
            const dados = JSON.parse(await file.text());
            
            estoqueProdutos = dados.produtos || [];
            vendas = dados.vendas || [];
            
            localStorage.setItem('pdv_sistema_katec', JSON.stringify(dados));
            localStorage.setItem('pdv_produtos_katec', JSON.stringify(estoqueProdutos));
            localStorage.setItem('pdv_vendas_katec', JSON.stringify(vendas));
            
            renderizarTabelaVendas();
            alert("Sistema carregado com sucesso!");
            return;
        } catch (err) {
            return;
        }
    }

    const inputOculto = document.createElement('input');
    inputOculto.type = 'file';
    inputOculto.accept = '.json';
    inputOculto.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const dados = JSON.parse(event.target.result);
                estoqueProdutos = dados.produtos || [];
                vendas = dados.vendas || [];
                
                localStorage.setItem('pdv_sistema_katec', JSON.stringify(dados));
                localStorage.setItem('pdv_produtos_katec', JSON.stringify(estoqueProdutos));
                localStorage.setItem('pdv_vendas_katec', JSON.stringify(vendas));
                
                renderizarTabelaVendas();
                alert("Sistema carregado com sucesso!");
            } catch (error) {
                alert("Erro ao ler o arquivo JSON.");
            }
        };
        reader.readAsText(file);
    };
    inputOculto.click();
}

// Vinculação corrigida com o ID exato que está no HTML (`btn-carregar-vendas`)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const btnCarregar = document.getElementById('btn-carregar-vendas');
        if (btnCarregar) {
            btnCarregar.addEventListener('click', carregarSistemaManual);
        }
    }, 300);
});


// ==========================================
// 4. HISTÓRICO DE VENDAS E MODAL DE DETALHES
// ==========================================
function renderizarTabelaVendas(filtro = '') {
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (vendas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 30px;">Nenhuma venda registrada.</td></tr>`;
        return;
    }

    const vendasFiltradas = vendas.filter(v => 
        v.numeroVenda.includes(filtro) || v.dataHora.toLowerCase().includes(filtro.toLowerCase())
    );

    if (vendasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 30px;">Nenhuma venda encontrada na busca.</td></tr>`;
        return;
    }

    vendasFiltradas.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="num-venda-clicavel" style="font-family: monospace; font-weight: bold; color: var(--green-success); cursor: pointer; text-decoration: underline;" title="Clique para ver os detalhes completos">${v.numeroVenda}</td>
            <td>${v.dataHora}</td>
            <td>${v.itens.reduce((acc, item) => acc + item.qtd, 0)}</td>
            <td>${v.descontoPercentual || 0}% (R$ ${parseFloat(v.desconto).toFixed(2).replace('.', ',')})</td>
            <td style="font-weight: bold;">R$ ${parseFloat(v.totalFinal).toFixed(2).replace('.', ',')}</td>
            <td>${v.formaPagamento}</td>
        `;

        tr.querySelector('.num-venda-clicavel').addEventListener('click', () => {
            abrirModalDetalhesVenda(v);
        });

        tbody.appendChild(tr);
    });
}

const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        renderizarTabelaVendas(this.value);
        resetarTimer();
    });
}

function criarModalDetalhesHTML() {
    if (document.getElementById('modal-detalhes-venda')) return;

    const div = document.createElement('div');
    div.innerHTML = `
        <div id="modal-detalhes-venda" class="modal-overlay hidden">
            <div class="modal-pdv-box" style="max-width: 600px; height: auto; max-height: 85vh;">
                <div class="pdv-header">
                    <h2>Detalhes da Venda</h2>
                    <button id="fechar-detalhes" class="btn-fechar">&times;</button>
                </div>
                <div id="conteudo-detalhes-venda" style="padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px;">
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);

    document.getElementById('fechar-detalhes').addEventListener('click', () => {
        document.getElementById('modal-detalhes-venda').classList.add('hidden');
    });
}
criarModalDetalhesHTML();

function abrirModalDetalhesVenda(v) {
    resetarTimer();
    const container = document.getElementById('conteudo-detalhes-venda');
    
    let itensHtml = '';
    v.itens.forEach(item => {
        let sub = item.qtd * item.valorVenda;
        itensHtml += `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.1); padding: 8px 0;">
                <span><b>${item.codigo}</b> - ${item.nome} (${item.qtd}x)</span>
                <span>R$ ${sub.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    });

    container.innerHTML = `
        <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 8px;">
            <p><b>Nº da Venda:</b> <span style="color: var(--green-success); font-family: monospace;">${v.numeroVenda}</span></p>
            <p><b>Data e Hora:</b> ${v.dataHora}</p>
            <p><b>Forma de Pagamento:</b> ${v.formaPagamento}</p>
        </div>
        <div>
            <h4 style="color: var(--blue-light); margin-bottom: 8px;">Itens da Venda:</h4>
            <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                ${itensHtml}
            </div>
        </div>
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--green-success); padding: 15px; border-radius: 8px; display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>R$ ${v.subtotal.toFixed(2).replace('.', ',')}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Desconto (${v.descontoPercentual || 0}%):</span> <span>- R$ ${v.desconto.toFixed(2).replace('.', ',')}</span></div>
            <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold; color: var(--green-success); border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px; margin-top: 5px;">
                <span>TOTAL PAGO:</span> <span>R$ ${v.totalFinal.toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
    `;

    document.getElementById('modal-detalhes-venda').classList.remove('hidden');
}


// ==========================================
// 5. FLUXO DA FRENTE DE CAIXA (MODAL PDV)
// ==========================================
const modalPdv = document.getElementById('modal-pdv');
const inputBip = document.getElementById('input-bip');
const inputDesconto = document.getElementById('input-desconto');

document.querySelector('.btn-nova-venda').addEventListener('click', () => {
    resetarTimer();
    const dadosSalvos = localStorage.getItem('pdv_sistema_katec');
    if (dadosSalvos) {
        try {
            const dados = JSON.parse(dadosSalvos);
            estoqueProdutos = dados.produtos || [];
        } catch(e) {}
    }
    
    carrinho = [];
    if(inputDesconto) inputDesconto.value = '0';
    renderizarCarrinho();
    modalPdv.classList.remove('hidden');
    inputBip.focus();
});

document.getElementById('fechar-pdv').addEventListener('click', () => {
    modalPdv.classList.add('hidden');
});

inputBip.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const codigoBipado = this.value.trim().padStart(5, '0');
        this.value = '';
        adicionarProdutoAoCarrinho(codigoBipado, 1);
    }
});

function adicionarProdutoAoCarrinho(codigo, qtdAdicionar) {
    const produtoEstoque = estoqueProdutos.find(p => p.codigo === codigo);
    if (!produtoEstoque) {
        alert("Produto não encontrado no estoque!");
        return;
    }

    const itemCarrinho = carrinho.find(item => item.codigo === codigo);
    const quantidadeAtualNoCarrinho = itemCarrinho ? itemCarrinho.qtd : 0;

    if (quantidadeAtualNoCarrinho + qtdAdicionar > produtoEstoque.quantidade) {
        alert(`Quantidade indisponível no estoque! Estoque atual: ${produtoEstoque.quantidade}`);
        return;
    }

    if (itemCarrinho) {
        itemCarrinho.qtd += qtdAdicionar;
    } else {
        carrinho.push({
            codigo: produtoEstoque.codigo,
            nome: produtoEstoque.nome,
            valorVenda: produtoEstoque.valorVenda,
            qtd: qtdAdicionar
        });
    }

    renderizarCarrinho();
    resetarTimer();
}

function renderizarCarrinho() {
    const tbody = document.querySelector('#tabela-carrinho tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let subtotal = 0;

    carrinho.forEach((item, index) => {
        const sub = item.qtd * item.valorVenda;
        subtotal += sub;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.nome}</td>
            <td>
                <span class="qtd-clicavel" data-index="${index}" title="Clique para alterar a quantidade" style="cursor: pointer; border-bottom: 1px dashed #38bdf8; font-weight: bold; color: var(--blue-light);">
                    ${item.qtd} ✎
                </span>
            </td>
            <td>R$ ${item.valorVenda.toFixed(2).replace('.', ',')}</td>
            <td>R$ ${sub.toFixed(2).replace('.', ',')}</td>
            <td><button class="btn-remover-item" data-index="${index}" style="background: #ef4444; border: none; color: #fff; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Remover</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.qtd-clicavel').forEach(span => {
        span.addEventListener('click', function() {
            const idx = this.getAttribute('data-index');
            const item = carrinho[idx];
            
            const novaQtdStr = prompt(`Alterar quantidade para o produto "${item.nome}" (Digite 0 para remover):`, item.qtd);
            if (novaQtdStr === null) return;

            const novaQtd = parseInt(novaQtdStr);
            if (isNaN(novaQtd) || novaQtd < 0) {
                alert("Quantidade inválida.");
                return;
            }

            if (novaQtd === 0) {
                carrinho.splice(idx, 1);
            } else {
                const produtoEstoque = estoqueProdutos.find(p => p.codigo === item.codigo);
                if (novaQtd > produtoEstoque.quantidade) {
                    alert(`Quantidade indisponível no estoque! Máximo permitido: ${produtoEstoque.quantidade}`);
                    return;
                }
                item.qtd = novaQtd;
            }

            renderizarCarrinho();
            resetarTimer();
        });
    });

    document.querySelectorAll('.btn-remover-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = this.getAttribute('data-index');
            const itemRemovido = carrinho[idx];
            
            if (confirm(`Deseja realmente remover o produto "${itemRemovido.nome}" da venda?`)) {
                carrinho.splice(idx, 1);
                renderizarCarrinho();
            }
        });
    });

    atualizarTotais(subtotal);
}

if (inputDesconto) {
    inputDesconto.addEventListener('input', () => {
        let subtotal = carrinho.reduce((acc, item) => acc + (item.qtd * item.valorVenda), 0);
        atualizarTotais(subtotal);
    });
}

function atualizarTotais(subtotal) {
    let percentualDesconto = parseFloat(inputDesconto.value) || 0;
    if (percentualDesconto < 0) percentualDesconto = 0;
    if (percentualDesconto > 100) percentualDesconto = 100;

    let valorDescontoEmReais = (subtotal * percentualDesconto) / 100;
    let totalFinal = subtotal - valorDescontoEmReais;
    if (totalFinal < 0) totalFinal = 0;

    const lblSub = document.getElementById('lbl-subtotal');
    if (lblSub) lblSub.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    
    let lblDescontoReais = document.getElementById('lbl-desconto-reais');
    if (!lblDescontoReais) {
        const resumoBox = document.querySelector('.resumo-box');
        if (resumoBox && resumoBox.children[1]) {
            const divDesc = document.createElement('div');
            divDesc.className = 'resumo-linha';
            divDesc.innerHTML = `<span>Desconto Aplicado:</span><span id="lbl-desconto-reais" style="color: #f59e0b;">R$ 0,00</span>`;
            resumoBox.children[1].after(divDesc);
            lblDescontoReais = document.getElementById('lbl-desconto-reais');
        }
    }
    if (lblDescontoReais) {
        lblDescontoReais.innerText = `- R$ ${valorDescontoEmReais.toFixed(2).replace('.', ',')} (${percentualDesconto}%)`;
    }

    const lblTotal = document.getElementById('lbl-total');
    if (lblTotal) lblTotal.innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
}


// ==========================================
// 6. FINALIZAR VENDA E SALVAR NO sistema.json
// ==========================================
document.getElementById('btn-finalizar-venda').addEventListener('click', async () => {
    if (carrinho.length === 0) {
        alert("Adicione produtos ao carrinho antes de finalizar!");
        return;
    }

    let subtotal = carrinho.reduce((acc, item) => acc + (item.qtd * item.valorVenda), 0);
    let percentualDesconto = parseFloat(inputDesconto.value) || 0;
    let descontoEmReais = (subtotal * percentualDesconto) / 100;
    let totalFinal = subtotal - descontoEmReais;
    if (totalFinal < 0) totalFinal = 0;

    const formaPagamento = document.getElementById('select-pagamento').value;
    const numeroVenda = String(vendas.length + 1).padStart(6, '0');
    
    const agora = new Date();
    const dataHora = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR');

    const novaVenda = {
        numeroVenda,
        dataHora,
        itens: [...carrinho],
        subtotal,
        descontoPercentual: percentualDesconto,
        desconto: descontoEmReais,
        totalFinal,
        formaPagamento
    };

    carrinho.forEach(itemCarrinho => {
        const prodEstoque = estoqueProdutos.find(p => p.codigo === itemCarrinho.codigo);
        if (prodEstoque) {
            prodEstoque.quantidade -= itemCarrinho.qtd;
        }
    });

    vendas.push(novaVenda);
    
    // Salva no sistema.json e atualiza a tabela na tela imediatamente
    await salvarSistemaNoComputador();
    renderizarTabelaVendas();

    modalPdv.classList.add('hidden');

    const imprimir = confirm("Venda finalizada com sucesso!\nDeseja imprimir o cupom fiscal?");
    if (imprimir) {
        imprimirCupomFiscal(novaVenda);
    }
});


// ==========================================
// 7. IMPRESSÃO TÉRMICA (2 VIAS)
// ==========================================
function imprimirCupomFiscal(venda) {
    const janelaCupom = window.open('', '_blank', 'width=350,height=600');
    
    let itensHtml = '';
    venda.itens.forEach(item => {
        let sub = item.qtd * item.valorVenda;
        itensHtml += `
            <div class="item-linha">
                <span>${item.codigo} - ${item.nome}</span>
                <span>${item.qtd}x R$ ${item.valorVenda.toFixed(2).replace('.', ',')} = R$ ${sub.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    });

    const gerarBlocoVia = (tipoVia) => `
        <div class="via-cupom">
            <div class="empresa">PDV KATEC</div>
            <div class="detalhes">
                <div>Cupom Fiscal / Não Fiscal</div>
                <div class="tipo-via">*** VIA DO ${tipoVia} ***</div>
                <div>Venda Nº: ${venda.numeroVenda}</div>
                <div>Data: ${venda.dataHora}</div>
            </div>
            
            <div class="itens">
                <div style="font-weight: bold; margin-bottom: 5px; text-align: center;">ITENS DA VENDA</div>
                ${itensHtml}
            </div>

            <div class="totais">
                <div>Subtotal: R$ ${venda.subtotal.toFixed(2).replace('.', ',')}</div>
                <div>Desconto (${venda.descontoPercentual || 0}%): R$ ${venda.desconto.toFixed(2).replace('.', ',')}</div>
                <div style="font-size: 13px;">TOTAL: R$ ${venda.totalFinal.toFixed(2).replace('.', ',')}</div>
                <div style="font-size: 10px; font-weight: normal;">Forma de Pagamento: ${venda.formaPagamento}</div>
            </div>

            <div class="rodape">
                Obrigado pela preferência!<br>
                Sistema PDV KATEC
            </div>
        </div>
        <div class="cortar-papel">----------------------------------------</div>
    `;

    janelaCupom.document.write(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Cupom Fiscal - Venda ${venda.numeroVenda}</title>
            <style>
                @page { size: auto; margin: 0mm; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 11px;
                    width: 78mm;
                    margin: 0;
                    padding: 5px;
                    background: #fff;
                    color: #000;
                    text-align: center;
                }
                .via-cupom { padding-bottom: 5px; }
                .empresa { font-size: 15px; font-weight: bold; margin-bottom: 3px; }
                .detalhes { font-size: 10px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
                .tipo-via { font-weight: bold; font-size: 11px; margin: 3px 0; background: #eee; padding: 2px; }
                .itens { text-align: left; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 5px; font-size: 10px; }
                .item-linha { margin-bottom: 3px; display: flex; flex-direction: column; }
                .totais { text-align: right; margin-bottom: 8px; font-weight: bold; font-size: 11px; }
                .totais div { margin-bottom: 2px; }
                .rodape { font-size: 9px; margin-top: 10px; margin-bottom: 15px; }
                .cortar-papel { font-size: 10px; letter-spacing: -1px; margin: 10px 0; color: #444; }
            </style>
        </head>
        <body>
            ${gerarBlocoVia('CLIENTE')}
            ${gerarBlocoVia('ESTABELECIMENTO')}
            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                }
            </script>
        </body>
        </html>
    `);
    janelaCupom.document.close();
}

/* === PDV KTEC V2: integração com sistema.json === */
document.addEventListener('pdv:sistema-carregado', () => {
  if (typeof produtosEstoque !== 'undefined') {
    produtosEstoque = PDVSistema.obterEstoque();
  }
  if (typeof vendas !== 'undefined') {
    vendas = PDVSistema.obterVendas();
  }
  if (typeof renderizarHistorico === 'function') renderizarHistorico();
});

async function salvarVendaNoSistema(novaVenda) {
  const s = PDVSistema.obterSistema();
  s.estoque = (typeof produtosEstoque !== 'undefined') ? produtosEstoque : s.estoque;
  s.vendas = (typeof vendas !== 'undefined') ? vendas : s.vendas;
  if (novaVenda && !s.vendas.includes(novaVenda)) s.vendas.push(novaVenda);
  await PDVSistema.salvarSistema();
}
