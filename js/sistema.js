/* PDV KTEC - sistema.js
   Fonte única de dados: sistema/sistema.json
   O arquivo é selecionado pelo botão "Carregar minha loja".
*/
(function () {
  'use strict';

  const DEFAULT_SYSTEM = {
    versao: 1,
    loja: { nome: 'Minha Loja' },
    estoque: [],
    vendas: []
  };

  let sistema = structuredClone(DEFAULT_SYSTEM);
  let arquivoHandle = null;

  function normalizar(dados) {
    const obj = dados && typeof dados === 'object' ? dados : {};
    return {
      versao: Number(obj.versao) || 1,
      loja: { nome: obj.loja?.nome || 'Minha Loja' },
      estoque: Array.isArray(obj.estoque) ? obj.estoque : [],
      vendas: Array.isArray(obj.vendas) ? obj.vendas : []
    };
  }

  async function lerArquivo(handle) {
    const file = await handle.getFile();
    const texto = await file.text();
    if (!texto.trim()) return structuredClone(DEFAULT_SYSTEM);
    return normalizar(JSON.parse(texto));
  }

  async function pedirPermissao(handle, mode = 'readwrite') {
    if (!handle?.queryPermission || !handle?.requestPermission) return true;
    if (await handle.queryPermission({ mode }) === 'granted') return true;
    return (await handle.requestPermission({ mode })) === 'granted';
  }

  async function salvarSistema() {
    if (!arquivoHandle) {
      throw new Error('Nenhum arquivo sistema.json foi carregado.');
    }

    if (!(await pedirPermissao(arquivoHandle, 'readwrite'))) {
      throw new Error('Permissão para salvar o sistema.json foi negada.');
    }

    const writable = await arquivoHandle.createWritable();
    await writable.write(JSON.stringify(sistema, null, 2));
    await writable.close();
    return true;
  }

  async function carregarLoja() {
    if (!window.showOpenFilePicker) {
      throw new Error('Seu navegador não suporta o seletor de arquivos necessário. Use Google Chrome ou Microsoft Edge.');
    }

    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{
        description: 'Banco do PDV KTEC',
        accept: { 'application/json': ['.json'] }
      }],
      excludeAcceptAllOption: false
    });

    const file = await handle.getFile();
    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Selecione um arquivo .json.');
    }

    const dados = await lerArquivo(handle);
    arquivoHandle = handle;
    sistema = dados;

    localStorage.setItem('pdv_loja_carregada', 'true');
    document.dispatchEvent(new CustomEvent('pdv:sistema-carregado', { detail: structuredClone(sistema) }));

    return sistema;
  }

  async function criarNovaLoja() {
    if (!window.showSaveFilePicker) {
      throw new Error('Seu navegador não suporta a criação de arquivos pelo navegador. Use Google Chrome ou Microsoft Edge.');
    }

    const handle = await window.showSaveFilePicker({
      suggestedName: 'sistema.json',
      types: [{
        description: 'Banco do PDV KTEC',
        accept: { 'application/json': ['.json'] }
      }]
    });

    arquivoHandle = handle;
    sistema = structuredClone(DEFAULT_SYSTEM);
    await salvarSistema();

    localStorage.setItem('pdv_loja_carregada', 'true');
    document.dispatchEvent(new CustomEvent('pdv:sistema-carregado', { detail: structuredClone(sistema) }));

    return sistema;
  }

  function obterSistema() {
    return sistema;
  }

  function obterEstoque() {
    return sistema.estoque;
  }

  function obterVendas() {
    return sistema.vendas;
  }

  function estaCarregado() {
    return !!arquivoHandle;
  }

  // As páginas podem alterar diretamente os arrays retornados e depois chamar salvarSistema().
  window.PDVSistema = {
    carregarLoja,
    criarNovaLoja,
    salvarSistema,
    obterSistema,
    obterEstoque,
    obterVendas,
    estaCarregado
  };

  window.addEventListener('beforeunload', function () {
    // Não tenta salvar automaticamente: a gravação deve ocorrer após cada alteração.
  });
})();
