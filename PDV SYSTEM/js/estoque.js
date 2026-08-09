// ==========================================
// CONFIGURAÇÕES E ESTADO DO SISTEMA UNIFICADO
// ==========================================
const PIN_CORRETO = '311204';
const TEMPO_INATIVIDADE_MINUTOS = 10;
const LIMITE_INATIVIDADE_MS = TEMPO_INATIVIDADE_MINUTOS * 60 * 1000;

let produtos = [];
let vendas = [];
let sistemaArquivoHandle = null; // Referência unificada para o sistema.json

const pinScreen = document.getElementById('pin-screen');
const estoqueContent = document.getElementById('estoque-content');
const pinInput = document.getElementById('pin-input');
const btnAcessar = document.getElementById('btn-acessar');
const errorMsg = document.getElementById('pin-error');

let timerInatividade;

// ==========================================
// 1. SISTEMA DE PIN E INATIVIDADE
// ==========================================
function validarPin() {
    if (pinInput.value === PIN_CORRETO) {
        pinScreen.classList.add('hidden');
        estoqueContent.classList.remove('hidden');
        pinInput.value = '';
        errorMsg.style.display = 'none';
        iniciarTimerInatividade();
        
        inicializarSistemaAutomatico();
    } else {
        errorMsg.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
    }
}

function bloquearTela() {
    pinScreen.classList.remove('hidden');
    estoqueContent.classList.add('hidden');
    pinInput.focus();
    clearTimeout(timerInatividade);
}

function iniciarTimerInatividade() {
    clearTimeout(timerInatividade);
    timerInatividade = setTimeout(bloquearTela, LIMITE_INATIVIDADE_MS);
}

function resetarTimer() {
    if (!estoqueContent.classList.contains('hidden')) {
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
// 2. PERSISTÊNCIA UNIFICADA (ESTOQUE + VENDAS)
// ==========================================
async function inicializarSistemaAutomatico() {
    if ('showSaveFilePicker' in window) {
        try {
            const savedHandle = JSON.parse(localStorage.getItem('pdv_sistema_file_handle'));
            if (savedHandle) {
                sistemaArquivoHandle = await verifyPermission(savedHandle, true);
                if (sistemaArquivoHandle) {
                    await lerSistemaJSON();
                    return;
                }
            }
        } catch (e) {
            console.log("Nenhum arquivo de sistema pré-vinculado encontrado.");
        }
    }
    carregarFallbackLocal();
}

async function salvarSistemaJSON() {
    const dadosSistema = { produtos, vendas };
    localStorage.setItem('pdv_sistema_katec', JSON.stringify(dadosSistema));
    localStorage.setItem('pdv_produtos_katec', JSON.stringify(produtos));
    localStorage.setItem('pdv_vendas_katec', JSON.stringify(vendas));

    if (sistemaArquivoHandle) {
        try {
            const writable = await sistemaArquivoHandle.createWritable();
            await writable.write(JSON.stringify(dadosSistema, null, 2));
            await writable.close();
            renderizarTabela();
            return;
        } catch (err) {
            console.log("Erro ao gravar no disco, solicitando novo local...");
        }
    }

    if ('showSaveFilePicker' in window) {
        try {
            const options = {
                suggestedName: 'sistema.json',
                types: [{
                    description: 'Arquivo JSON Unificado do Sistema',
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
        baixarJSONAutomatico();
    }
    
    renderizarTabela();
}

async function lerSistemaJSON() {
    if (!sistemaArquivoHandle) return;
    try {
        const file = await sistemaArquivoHandle.getFile();
        const conteudo = await file.text();
        const dados = JSON.parse(conteudo);
        
        produtos = dados.produtos || [];
        vendas = dados.vendas || [];
        
        localStorage.setItem('pdv_sistema_katec', JSON.stringify(dados));
        localStorage.setItem('pdv_produtos_katec', JSON.stringify(produtos));
        localStorage.setItem('pdv_vendas_katec', JSON.stringify(vendas));
        
        renderizarTabela();
    } catch (err) {
        carregarFallbackLocal();
    }
}

async function verifyPermission(fileHandle, readWrite) {
    const options = {};
    if (readWrite) options.mode = 'readwrite';
    if ((await fileHandle.queryPermission(options)) === 'granted') return fileHandle;
    if ((await fileHandle.requestPermission(options)) === 'granted') return fileHandle;
    return null;
}

function carregarFallbackLocal() {
    const dadosSalvos = localStorage.getItem('pdv_sistema_katec');
    if (dadosSalvos) {
        try {
            const dados = JSON.parse(dadosSalvos);
            produtos = dados.produtos || [];
            vendas = dados.vendas || [];
        } catch (e) {
            produtos = [];
            vendas = [];
        }
    } else {
        const prodAntigos = localStorage.getItem('pdv_produtos_katec');
        const vendasAntigas = localStorage.getItem('pdv_vendas_katec');
        produtos = prodAntigos ? JSON.parse(prodAntigos) : [];
        vendas = vendasAntigas ? JSON.parse(vendasAntigas) : [];
    }
    renderizarTabela();
}

function baixarJSONAutomatico() {
    const dadosSistema = { produtos, vendas };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosSistema, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "sistema.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// ==========================================
// FUNÇÃO PARA CARREGAR MANUALMENTE O SISTEMA.JSON
// ==========================================
async function carregarSistemaManual() {
    resetarTimer();
    
    if ('showOpenFilePicker' in window) {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Arquivos JSON',
                    accept: { 'application/json': ['.json'] }
                }],
                multiple: false
            });
            
            sistemaArquivoHandle = handle;
            localStorage.setItem('pdv_sistema_file_handle', JSON.stringify(sistemaArquivoHandle));
            
            const file = await handle.getFile();
            const conteudo = await file.text();
            const dados = JSON.parse(conteudo);
            
            produtos = dados.produtos || [];
            vendas = dados.vendas || [];
            
            localStorage.setItem('pdv_sistema_katec', JSON.stringify(dados));
            localStorage.setItem('pdv_produtos_katec', JSON.stringify(produtos));
            localStorage.setItem('pdv_vendas_katec', JSON.stringify(vendas));
            
            renderizarTabela();
            alert("Sistema carregado com sucesso!");
            return;
        } catch (err) {
            console.log("Carregamento manual cancelado ou recusado.");
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
                produtos = dados.produtos || [];
                vendas = dados.vendas || [];
                
                localStorage.setItem('pdv_sistema_katec', JSON.stringify(dados));
                localStorage.setItem('pdv_produtos_katec', JSON.stringify(produtos));
                localStorage.setItem('pdv_vendas_katec', JSON.stringify(vendas));
                
                renderizarTabela();
                alert("Sistema carregado com sucesso!");
            } catch (error) {
                alert("Erro ao ler o arquivo JSON. Certifique-se de que o formato é válido.");
            }
        };
        reader.readAsText(file);
    };

    inputOculto.click();
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const btnCarregar = document.getElementById('btn-carregar-json');
        if (btnCarregar) {
            btnCarregar.addEventListener('click', carregarSistemaManual);
        }
    }, 500);
});


// ==========================================
// 3. RENDERIZAÇÃO DA TABELA E MODAIS
// ==========================================
function renderizarTabela(filtro = '') {
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (produtos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 30px;">Nenhum produto cadastrado no estoque.</td></tr>`;
        return;
    }

    const produtosFiltrados = produtos.filter(p => 
        p.codigo.includes(filtro) || p.nome.toLowerCase().includes(filtro.toLowerCase())
    );

    if (produtosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 30px;">Nenhum produto encontrado na busca.</td></tr>`;
        return;
    }

    produtosFiltrados.forEach(p => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td class="codigo-destaque" style="cursor: pointer;" title="Clique para imprimir etiqueta">${p.codigo}</td>
            <td style="cursor: pointer;" title="Clique para imprimir etiqueta">${p.nome}</td>
            <td style="cursor: pointer;" title="Clique para imprimir etiqueta">R$ ${parseFloat(p.valorEstoque).toFixed(2).replace('.', ',')}</td>
            <td style="cursor: pointer;" title="Clique para imprimir etiqueta">R$ ${parseFloat(p.valorVenda).toFixed(2).replace('.', ',')}</td>
            <td class="qtd-destaque" style="cursor: pointer;" title="Clique para imprimir etiqueta">${p.quantidade}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-acao-tabela btn-tabela-editar" title="Editar Produto">✎</button>
                    <button class="btn-acao-tabela btn-tabela-remover" title="Remover Produto">-</button>
                </div>
            </td>
        `;

        tr.querySelectorAll('td:not(:last-child)').forEach(td => {
            td.addEventListener('click', () => solicitarImpressaoEtiqueta(p));
        });

        tr.querySelector('.btn-tabela-editar').addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModalEditar(p.codigo);
        });

        tr.querySelector('.btn-tabela-remover').addEventListener('click', (e) => {
            e.stopPropagation();
            removerProdutoPorCodigo(p.codigo);
        });

        tbody.appendChild(tr);
    });
}

function gerarProximoCodigo() {
    if (produtos.length === 0) return '00001';
    const ultimoCodigo = parseInt(produtos[produtos.length - 1].codigo);
    return String(ultimoCodigo + 1).padStart(5, '0');
}


// ==========================================
// 4. CRIAÇÃO DOS MODAIS VISUAIS
// ==========================================
function criarInjetarModaisHTML() {
    if (document.getElementById('modal-overlay')) return;

    const divModais = document.createElement('div');
    divModais.innerHTML = `
        <div id="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:999; backdrop-filter:blur(5px); justify-content:center; align-items:center;">
            
            <!-- MODAL ADICIONAR -->
            <div id="modal-add" class="modal-box" style="display:none;">
                <h3>Adicionar Novo Produto</h3>
                <input type="text" id="add-nome" placeholder="Nome do Produto">
                <input type="number" step="0.01" id="add-vestoque" placeholder="Valor de Estoque (Custo)">
                <input type="number" step="0.01" id="add-vvenda" placeholder="Valor de Venda">
                <input type="number" id="add-qtd" placeholder="Quantidade">
                <div class="modal-botoes">
                    <button id="salvar-add" class="btn-modal-salvar">Salvar</button>
                    <button class="fechar-modal btn-modal-cancelar">Cancelar</button>
                </div>
            </div>

            <!-- MODAL EDITAR -->
            <div id="modal-edit" class="modal-box" style="display:none;">
                <h3>Editar Produto</h3>
                <input type="hidden" id="edit-codigo-original">
                <input type="text" id="edit-nome" placeholder="Nome do Produto">
                <input type="number" step="0.01" id="edit-vestoque" placeholder="Valor de Estoque (Custo)">
                <input type="number" step="0.01" id="edit-vvenda" placeholder="Valor de Venda">
                <input type="number" id="edit-qtd" placeholder="Quantidade">
                <div class="modal-botoes">
                    <button id="salvar-edit" class="btn-modal-salvar">Atualizar</button>
                    <button class="fechar-modal btn-modal-cancelar">Cancelar</button>
                </div>
            </div>

        </div>
    `;
    document.body.appendChild(divModais);
}

function injetarEstilosModais() {
    if (document.getElementById('estilos-extras-modais')) return;
    const style = document.createElement('style');
    style.id = 'estilos-extras-modais';
    style.innerHTML = `
        .btn-acao-tabela {
            background: rgba(30, 41, 59, 0.9);
            border: 1px solid rgba(56, 189, 248, 0.3);
            color: #f8fafc;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            transition: 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .btn-tabela-editar:hover { background: #f59e0b; color: #000; border-color: #f59e0b; }
        .btn-tabela-remover:hover { background: #ef4444; color: #fff; border-color: #ef4444; }
        
        .modal-box {
            background: #0f172a;
            border: 1px solid #38bdf8;
            padding: 30px;
            border-radius: 15px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .modal-box h3 { color: #38bdf8; margin-bottom: 5px; font-size: 1.4rem; }
        .modal-box input {
            background: rgba(0,0,0,0.5);
            border: 1px solid #0284c7;
            color: #fff;
            padding: 12px;
            border-radius: 8px;
            outline: none;
            font-family: 'Montserrat', sans-serif;
        }
        .modal-box input:focus { border-color: #38bdf8; box-shadow: 0 0 10px rgba(56,189,248,0.4); }
        .modal-botoes { display: flex; gap: 10px; margin-top: 10px; }
        .btn-modal-salvar { background: #0284c7; color: #fff; border: none; padding: 10px; flex: 1; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-modal-salvar:hover { background: #38bdf8; color: #000; }
        .btn-modal-cancelar { background: #334155; color: #fff; border: none; padding: 10px; flex: 1; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-modal-cancelar:hover { background: #475569; }
    `;
    document.head.appendChild(style);
}

injetarEstilosModais();
criarInjetarModaisHTML();

const overlay = document.getElementById('modal-overlay');
const modalAdd = document.getElementById('modal-add');
const modalEdit = document.getElementById('modal-edit');

function fecharModais() {
    overlay.style.display = 'none';
    modalAdd.style.display = 'none';
    modalEdit.style.display = 'none';
}

document.querySelectorAll('.fechar-modal').forEach(btn => btn.addEventListener('click', fecharModais));
overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModais(); });


// ==========================================
// 5. AÇÕES DOS CARDS E BOTÕES
// ==========================================
document.querySelector('.btn-add').addEventListener('click', () => {
    resetarTimer();
    document.getElementById('add-nome').value = '';
    document.getElementById('add-vestoque').value = '';
    document.getElementById('add-vvenda').value = '';
    document.getElementById('add-qtd').value = '';
    
    overlay.style.display = 'flex';
    modalAdd.style.display = 'flex';
    document.getElementById('add-nome').focus();
});

document.getElementById('salvar-add').addEventListener('click', async () => {
    const nome = document.getElementById('add-nome').value.trim();
    const valorEstoque = parseFloat(document.getElementById('add-vestoque').value);
    const valorVenda = parseFloat(document.getElementById('add-vvenda').value);
    const quantidade = parseInt(document.getElementById('add-qtd').value);

    if (!nome || isNaN(valorEstoque) || isNaN(valorVenda) || isNaN(quantidade)) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    const novoProduto = {
        codigo: gerarProximoCodigo(),
        nome: nome,
        valorEstoque: valorEstoque,
        valorVenda: valorVenda,
        quantidade: quantidade
    };

    produtos.push(novoProduto);
    await salvarSistemaJSON();
    fecharModais();
});

function abrirModalEditar(codigo) {
    resetarTimer();
    const produto = produtos.find(p => p.codigo === codigo);
    if (!produto) return;

    document.getElementById('edit-codigo-original').value = produto.codigo;
    document.getElementById('edit-nome').value = produto.nome;
    document.getElementById('edit-vestoque').value = produto.valorEstoque;
    document.getElementById('edit-vvenda').value = produto.valorVenda;
    document.getElementById('edit-qtd').value = produto.quantidade;

    overlay.style.display = 'flex';
    modalEdit.style.display = 'flex';
}

document.querySelector('.btn-edit-card').addEventListener('click', () => {
    resetarTimer();
    const codigoInput = prompt("Digite o código de 5 dígitos do produto que deseja editar (ex: 00001):");
    if (!codigoInput) return;
    const codigoFormatado = codigoInput.padStart(5, '0');
    
    const existe = produtos.some(p => p.codigo === codigoFormatado);
    if (!existe) {
        alert("Produto não encontrado!");
        return;
    }
    abrirModalEditar(codigoFormatado);
});

document.getElementById('salvar-edit').addEventListener('click', async () => {
    const codigoOriginal = document.getElementById('edit-codigo-original').value;
    const produto = produtos.find(p => p.codigo === codigoOriginal);

    if (produto) {
        produto.nome = document.getElementById('edit-nome').value.trim() || produto.nome;
        produto.valorEstoque = parseFloat(document.getElementById('edit-vestoque').value) || produto.valorEstoque;
        produto.valorVenda = parseFloat(document.getElementById('edit-vvenda').value) || produto.valorVenda;
        produto.quantidade = parseInt(document.getElementById('edit-qtd').value) || produto.quantidade;

        await salvarSistemaJSON();
        fecharModais();
    }
});

async function removerProdutoPorCodigo(codigo) {
    resetarTimer();
    const index = produtos.findIndex(p => p.codigo === codigo);
    if (index === -1) return;

    if (confirm(`Deseja realmente remover o produto: ${produtos[index].nome}?`)) {
        produtos.splice(index, 1);
        await salvarSistemaJSON();
    }
}

document.querySelector('.btn-remove').addEventListener('click', () => {
    resetarTimer();
    const codigoInput = prompt("Digite o código de 5 dígitos do produto que deseja remover:");
    if (!codigoInput) return;
    removerProdutoPorCodigo(codigoInput.padStart(5, '0'));
});


// ==========================================
// 6. SISTEMA DE PESQUISA E ETIQUETAS TÉRMICAS
// ==========================================
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        renderizarTabela(this.value);
        resetarTimer();
    });
}

function solicitarImpressaoEtiqueta(produto) {
    resetarTimer();
    const qtdInput = prompt(`Quantas etiquetas deseja imprimir para o produto "${produto.nome}"?`, "1");
    if (qtdInput === null) return;

    const quantidade = parseInt(qtdInput);
    if (isNaN(quantidade) || quantidade <= 0) {
        alert("Por favor, insira um número válido de quantidade.");
        return;
    }

    imprimirEtiquetaTermica(produto, quantidade);
}

function imprimirEtiquetaTermica(produto, quantidade) {
    const janelaImpressao = window.open('', '_blank', 'width=400,height=500');
    
    let etiquetasHTML = '';
    for (let i = 0; i < quantidade; i++) {
        etiquetasHTML += `
            <div class="etiqueta-termica">
                <div class="nome-produto">${produto.nome}</div>
                <div class="codigo-barras">*${produto.codigo}*</div>
                <div class="numeracao">Cód: ${produto.codigo}</div>
                <div class="preco">R$ ${parseFloat(produto.valorVenda).toFixed(2).replace('.', ',')}</div>
            </div>
        `;
    }

    janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Etiquetas - ${produto.codigo}</title>
            <style>
                @page { size: auto; margin: 0mm; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    text-align: center;
                    margin: 0;
                    padding: 5px;
                    background: #fff;
                    color: #000;
                }
                .etiqueta-termica {
                    display: block;
                    width: 100%;
                    max-width: 95mm;
                    padding: 4px 0;
                    page-break-after: always;
                }
                .nome-produto {
                    font-size: 11px;
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-bottom: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .codigo-barras {
                    font-family: 'Libre Barcode 128', cursive;
                    font-size: 55px;
                    line-height: 0.9;
                    margin: 2px 0;
                }
                .numeracao {
                    font-size: 12px;
                    font-weight: bold;
                    letter-spacing: 3px;
                    margin-bottom: 2px;
                }
                .preco {
                    font-size: 14px;
                    font-weight: bold;
                }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        </head>
        <body>
            ${etiquetasHTML}
            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                }
            </script>
        </body>
        </html>
    `);
    janelaImpressao.document.close();
}

carregarFallbackLocal();

/* === PDV KTEC V2: integração com sistema.json ===
   A lógica existente pode continuar funcionando; este adaptador sincroniza
   o array global "produtos" com o arquivo central após alterações.
*/
document.addEventListener('pdv:sistema-carregado', () => {
  if (typeof produtos !== 'undefined') {
    produtos = PDVSistema.obterEstoque();
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof renderizarProdutos === 'function') renderizarProdutos();
  }
});

async function salvarEstoqueNoSistema() {
  if (typeof produtos !== 'undefined') {
    const s = PDVSistema.obterSistema();
    s.estoque = produtos;
    await PDVSistema.salvarSistema();
  }
}
