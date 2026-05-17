// ============ DADOS GLOBAIS ============
let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];
let usuario = JSON.parse(localStorage.getItem("usuario")) || null;
let historialPedidos = JSON.parse(localStorage.getItem("historialPedidos")) || [];
let enderecosSalvos = JSON.parse(localStorage.getItem("enderecosSalvos")) || [];
let pontosFidelidade = JSON.parse(localStorage.getItem("pontosFidelidade")) || { total: 0, nivel: "Bronze" };

let total = 0;
let desconto = 0;
let taxaEntrega = 0;

const NUMERO_WHATSAPP = "5591992556490";

const HERO_VIDEO_SRC = "video.mp4";

/** Vídeo só em telas maiores: em ≤768px remove fonte MP4 (economia de rede/CPU) e usa poster + fundo CSS. */
function initHeroVideoLeveMobile() {
  const video = document.getElementById("heroVideo");
  if (!video) return;
  const mq = window.matchMedia("(max-width: 768px)");
  function apply() {
    if (mq.matches) {
      video.querySelectorAll("source").forEach((s) => s.remove());
      video.pause();
      video.removeAttribute("src");
      video.preload = "none";
      video.load();
    } else {
      if (!video.querySelector("source")) {
        const s = document.createElement("source");
        s.src = HERO_VIDEO_SRC;
        s.type = "video/mp4";
        video.insertBefore(s, video.firstChild);
      }
      video.preload = "metadata";
      video.load();
      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {});
      }
    }
  }
  apply();
  mq.addEventListener("change", apply);
}

function scrollParaMenuCardapio() {
  const el = document.getElementById("menu");
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  el.scrollIntoView({
    behavior: reduce || mobile ? "auto" : "smooth",
    block: "start",
  });
}

// Cupons disponíveis
const cuponsDisponiveis = {
  "BEMVINDO10": { desconto: 10, tipo: "porcentagem", descricao: "10% de desconto" },
  "PRIMEIRA20": { desconto: 20, tipo: "porcentagem", descricao: "20% de desconto primeira compra" },
  "AMIGOS": { desconto: 5, tipo: "reais", descricao: "R$ 5 de desconto" },
  "FRIDAY15": { desconto: 15, tipo: "porcentagem", descricao: "15% sextas-feiras" }
};

// ============ INICIALIZAÇÃO ============
function initBackdropFecharModais() {
  const loginModal = document.getElementById("loginModal");
  const pedidoModal = document.getElementById("pedidoModal");
  const avaliacaoModal = document.getElementById("avaliacaoModal");

  if (loginModal) {
    loginModal.addEventListener("click", function (event) {
      if (event.target === loginModal) fecharLogin();
    });
  }
  if (pedidoModal) {
    pedidoModal.addEventListener("click", function (event) {
      if (event.target === pedidoModal) fecharModal();
    });
  }
  if (avaliacaoModal) {
    avaliacaoModal.addEventListener("click", function (event) {
      if (event.target === avaliacaoModal) fecharAvaliacaoModal();
    });
  }
}

function initMobileCartPremium() {
  const panel = document.getElementById("cartPanel");
  const toggle = document.getElementById("cartToggle");
  if (!panel || !toggle) return;

  const mq = window.matchMedia("(max-width: 480px)");

  function syncExpandedState(collapsed) {
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    document.body.classList.toggle("cart-sheet-collapsed", collapsed);
  }

  function leaveMobileLayout() {
    panel.classList.remove("cart--collapsed");
    document.body.classList.remove("cart-sheet-collapsed");
    toggle.setAttribute("aria-expanded", "true");
  }

  mq.addEventListener("change", function () {
    if (!mq.matches) leaveMobileLayout();
  });
  if (!mq.matches) leaveMobileLayout();

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!mq.matches) return;
    panel.classList.toggle("cart--collapsed");
    syncExpandedState(panel.classList.contains("cart--collapsed"));
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initHeroVideoLeveMobile();
  initMobileCartPremium();
  atualizarCarrinho();
  aplicarEstrelas();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") buscarProduto();
    });
  }

  initBackdropFecharModais();

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".modal-dinamico").forEach((m) => m.remove());
    const loginModal = document.getElementById("loginModal");
    const pedidoModal = document.getElementById("pedidoModal");
    const avaliacaoModal = document.getElementById("avaliacaoModal");
    if (loginModal) loginModal.style.display = "none";
    if (pedidoModal) pedidoModal.style.display = "none";
    if (avaliacaoModal) avaliacaoModal.style.display = "none";
  });
});

// ============ CARRINHO ============
function addCarrinho(nome, preco, rating = 4) {
  carrinho.push({ 
    nome, 
    preco, 
    rating,
    quantidade: 1,
    id: Date.now()
  });
  atualizarCarrinho();
  mostrarNotificacao(`✅ ${nome} adicionado ao carrinho!`);
}

function atualizarCarrinho() {
  const lista = document.getElementById("cart-items");
  const totalEl = document.getElementById("total");
  const subtotalEl = document.getElementById("subtotal");
  const taxaEl = document.getElementById("taxa");
  const contador = document.getElementById("contador");
  if (!lista || !totalEl || !subtotalEl || !taxaEl || !contador) return;

  lista.innerHTML = "";
  total = 0;

  carrinho.forEach((item, index) => {
    total += item.preco;
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="item-text">
        <div>${item.nome}</div>
        <div style="font-size: 0.8rem; color: #ff9500;">R$ ${item.preco.toFixed(2)}</div>
      </div>
      <button type="button" onclick="removerItem(${index})" style="min-width: 30px;" aria-label="Remover item do carrinho">🗑️</button>
    `;
    lista.appendChild(li);
  });

  const totalComTaxa = total + taxaEntrega - desconto;
  
  subtotalEl.innerText = `R$ ${total.toFixed(2)}`;
  taxaEl.innerText = `R$ ${taxaEntrega.toFixed(2)}`;
  totalEl.innerText = `${totalComTaxa.toFixed(2)}`;
  contador.innerText = carrinho.length;

  const inlineTotal = document.getElementById("cartInlineTotal");
  if (inlineTotal) {
    inlineTotal.textContent =
      carrinho.length > 0 ? `R$ ${totalComTaxa.toFixed(2)}` : "";
  }

  localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function removerItem(index) {
  const lista = document.getElementById("cart-items");
  if (lista.children[index]) {
    const itemEl = lista.children[index];
    itemEl.classList.add("removing");

    setTimeout(() => {
      carrinho.splice(index, 1);
      atualizarCarrinho();
    }, 300);
  }
}

// ============ FAVORITOS ============
function adicionarFavorito(nome, preco) {
  const jaExiste = favoritos.find(f => f.nome === nome);
  
  if (jaExiste) {
    favoritos = favoritos.filter(f => f.nome !== nome);
    mostrarNotificacao("❤️ Removido dos favoritos");
  } else {
    favoritos.push({ nome, preco, data: new Date() });
    mostrarNotificacao("❤️ Adicionado aos favoritos!");
  }
  
  localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

// ============ BUSCA ============
function buscarProduto() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  const raw = searchInput.value;
  const termo = raw.trim().toLowerCase();
  const cards = document.querySelectorAll(".card");

  if (!termo) {
    cards.forEach((card) => card.style.removeProperty("display"));
    return;
  }

  let encontrados = 0;

  cards.forEach((card) => {
    const titulo = card.querySelector("h3").textContent.toLowerCase();
    if (titulo.includes(termo)) {
      card.style.removeProperty("display");
      encontrados++;
    } else {
      card.style.display = "none";
    }
  });

  if (encontrados === 0) {
    mostrarNotificacao(`❌ Nenhum produto encontrado para "${raw.trim()}"`);
  } else {
    mostrarNotificacao(`🔍 ${encontrados} produto(s) encontrado(s)`);
  }
}

// ============ FILTROS ============
function filtrarCategoria(categoria, btnEl) {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach((btn) => btn.classList.remove("active"));
  if (btnEl && btnEl.classList.contains("filter-btn")) {
    btnEl.classList.add("active");
  }

  // Mostrar/ocultar categorias
  const categorias = document.querySelectorAll(".categoria");
  categorias.forEach(cat => {
    cat.style.display = "none";
  });

  if (categoria === "todos") {
    categorias.forEach(cat => {
      cat.style.display = "block";
    });
  } else {
    const catId = `categoria-${categoria}`;
    const catElement = document.getElementById(catId);
    if (catElement) {
      catElement.style.display = "block";
    }
  }

  const menuEl = document.getElementById("menu");
  if (menuEl) {
    menuEl.classList.add("is-filtering");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        menuEl.classList.remove("is-filtering");
      });
    });
  }
}

// ============ MODAL - LOGIN ============
function abrirLogin() {
  if (usuario) {
    mostrarNotificacao(`👋 Bem-vindo, ${usuario.nome}!`);
    return;
  }
  document.getElementById("loginModal").style.display = "flex";
}

function fecharLogin() {
  document.getElementById("loginModal").style.display = "none";
  limparAbasLogin();
}

function abrirAba(aba, btnEl) {
  document.querySelectorAll(".tab-content").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((el) => el.classList.remove("active"));

  document.getElementById(`aba-${aba}`).classList.add("active");
  if (btnEl && btnEl.classList.contains("tab-btn")) {
    btnEl.classList.add("active");
  }
}

function fazerLogin() {
  const email = document.getElementById("emailLogin").value;
  const senha = document.getElementById("senhaLogin").value;

  if (!email || !senha) {
    mostrarNotificacao("Preencha todos os campos do login.");
    return;
  }

  usuario = {
    nome: email.split("@")[0],
    email: email,
    data: new Date()
  };

  localStorage.setItem("usuario", JSON.stringify(usuario));
  fecharLogin();
  mostrarNotificacao(`✅ Bem-vindo, ${usuario.nome}!`);
}

function fazerRegistro() {
  const nome = document.getElementById("nomeRegistro").value;
  const email = document.getElementById("emailRegistro").value;
  const tele = document.getElementById("teleRegistro").value;
  const senha = document.getElementById("senhaRegistro").value;
  const senhaConfirm = document.getElementById("senhaConfirm").value;

  if (!nome || !email || !tele || !senha || !senhaConfirm) {
    mostrarNotificacao("Preencha todos os campos do cadastro.");
    return;
  }

  if (senha !== senhaConfirm) {
    mostrarNotificacao("As senhas não conferem.");
    return;
  }

  usuario = {
    nome: nome,
    email: email,
    telefone: tele,
    data: new Date()
  };

  localStorage.setItem("usuario", JSON.stringify(usuario));
  fecharLogin();
  mostrarNotificacao(`✅ Cadastro realizado com sucesso, ${nome}!`);
}

function limparAbasLogin() {
  document.getElementById("emailLogin").value = "";
  document.getElementById("senhaLogin").value = "";
  document.getElementById("nomeRegistro").value = "";
  document.getElementById("emailRegistro").value = "";
  document.getElementById("teleRegistro").value = "";
  document.getElementById("senhaRegistro").value = "";
  document.getElementById("senhaConfirm").value = "";
}

// ============ MODAL - PEDIDO ============
function abrirModal() {
  if (carrinho.length === 0) {
    mostrarNotificacao("🛒 Adicione itens ao carrinho!");
    return;
  }

  const cartPanel = document.getElementById("cartPanel");
  if (cartPanel && cartPanel.classList.contains("cart--collapsed")) {
    cartPanel.classList.remove("cart--collapsed");
    document.body.classList.remove("cart-sheet-collapsed");
    const tg = document.getElementById("cartToggle");
    if (tg) tg.setAttribute("aria-expanded", "true");
  }

  if (usuario) {
    document.getElementById("nome").value = usuario.nome;
    document.getElementById("email").value = usuario.email || "";
    document.getElementById("telefone").value = usuario.telefone || "";
  }

  // Listar endereços salvos
  const enderecosList = document.getElementById("enderecos-salvos-list");
  if (enderecosList) {
    enderecosList.innerHTML = listarEnderecosSalvos();
  }
  
  atualizarPontosFidelidade();
  atualizarResumoModal();
  document.getElementById("pedidoModal").style.display = "flex";
}

function fecharModal() {
  document.getElementById("pedidoModal").style.display = "none";
}

function atualizarResumoModal() {
  const subtotal = total;
  const totalFinal = total + taxaEntrega - desconto;

  document.getElementById("resumoSubtotal").innerText = `R$ ${subtotal.toFixed(2)}`;
  document.getElementById("resumoTaxa").innerText = `R$ ${taxaEntrega.toFixed(2)}`;
  document.getElementById("resumoTotal").innerText = `R$ ${totalFinal.toFixed(2)}`;

  if (desconto > 0) {
    document.getElementById("resumoDesconto").style.display = "block";
    document.getElementById("resumoDescontoValor").innerText = `-R$ ${desconto.toFixed(2)}`;
  } else {
    document.getElementById("resumoDesconto").style.display = "none";
  }
}

// ============ ENTREGA ============
function calcularEntrega() {
  const bairro = document.getElementById("bairro").value;
  
  if (!bairro) {
    mostrarNotificacao("Digite o bairro para calcular a entrega.");
    return;
  }

  const taxasPorBairro = {
    "centro": 5,
    "savassi": 8,
    "santo antônio": 6,
    "funcionários": 7,
    "pampulha": 10,
    "lourdes": 7,
    "belvedere": 12,
    "default": 8
  };

  taxaEntrega = taxasPorBairro[bairro.toLowerCase()] || taxasPorBairro["default"];
  
  document.getElementById("taxa").innerText = taxaEntrega.toFixed(2);
  atualizarCarrinho();
  atualizarResumoModal();
  
  mostrarNotificacao(`✅ Taxa de entrega: R$ ${taxaEntrega.toFixed(2)}`);
}

// ============ CUPONS ============
function aplicarCupom() {
  const codigoCupom = document.getElementById("cupom").value.toUpperCase();
  const cupomInfo = document.getElementById("cupomInfo");

  if (!codigoCupom) {
    cupomInfo.textContent = "Digite um código!";
    cupomInfo.className = "erro";
    return;
  }

  const cupom = cuponsDisponiveis[codigoCupom];

  if (!cupom) {
    cupomInfo.textContent = "Cupom inválido!";
    cupomInfo.className = "erro";
    desconto = 0;
  } else {
    if (cupom.tipo === "porcentagem") {
      desconto = (total * cupom.desconto) / 100;
    } else {
      desconto = cupom.desconto;
    }

    cupomInfo.textContent = `✅ ${cupom.descricao} - Desconto: R$ ${desconto.toFixed(2)}`;
    cupomInfo.className = "sucesso";
    mostrarNotificacao(`🎁 Cupom aplicado! Economiza R$ ${desconto.toFixed(2)}`);
  }

  atualizarCarrinho();
  atualizarResumoModal();
}

// ============ PAGAMENTO ============
function mostrarPagamento() {
  const pagamento = document.getElementById("pagamento").value;

  document.getElementById("pix-box").style.display = "none";
  document.getElementById("cartao-box").style.display = "none";
  document.getElementById("dinheiro-box").style.display = "none";

  if (pagamento === "pix") {
    document.getElementById("pix-box").style.display = "block";
    const valor = total + taxaEntrega - desconto;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020126580014br.gov.bcb.brcode0136${valor}`;
    document.getElementById("qrcodePix").src = qr;
  }

  if (pagamento === "credito" || pagamento === "debito") {
    document.getElementById("cartao-box").style.display = "block";
  }

  if (pagamento === "dinheiro") {
    document.getElementById("dinheiro-box").style.display = "block";
  }
}

function copiarChave() {
  const chave = document.getElementById("chavePix").textContent;
  navigator.clipboard.writeText(chave).then(() => {
    mostrarNotificacao("✅ Chave PIX copiada!");
  });
}

// ============ ENVIO DO PEDIDO ============
function enviarWhats() {
  let nome = document.getElementById("nome").value;
  let email = document.getElementById("email").value;
  let telefone = document.getElementById("telefone").value;
  let endereco = document.getElementById("endereco").value;
  let bairro = document.getElementById("bairro").value;
  let numero = document.getElementById("numero").value;
  let complemento = document.getElementById("complemento").value;
  let cep = document.getElementById("cep").value;
  let pagamento = document.getElementById("pagamento").value;
  let obs = document.getElementById("obs").value;

  if (!nome || !telefone || !endereco || !bairro || !numero || !pagamento) {
    mostrarNotificacao("Preencha os campos obrigatórios do pedido.");
    return;
  }

  if (carrinho.length === 0) {
    mostrarNotificacao("Adicione itens ao carrinho.");
    return;
  }

  // Montar mensagem
  let mensagem = `🍔 *NOVO PEDIDO NOIR BURGERS* 🍔\n\n`;
  mensagem += `👤 *Cliente:* ${nome}\n`;
  mensagem += `📱 *Telefone:* ${telefone}\n`;
  mensagem += `📧 *Email:* ${email}\n\n`;

  mensagem += `🛒 *ITENS:*\n`;
  carrinho.forEach(item => {
    mensagem += `• ${item.nome} - R$ ${item.preco.toFixed(2)}\n`;
  });

  mensagem += `\n💰 *VALORES:*\n`;
  mensagem += `Subtotal: R$ ${total.toFixed(2)}\n`;
  if (taxaEntrega > 0) {
    mensagem += `🚚 Taxa de entrega: R$ ${taxaEntrega.toFixed(2)}\n`;
  }
  if (desconto > 0) {
    mensagem += `🎁 Desconto: -R$ ${desconto.toFixed(2)}\n`;
  }
  mensagem += `💳 *TOTAL: R$ ${(total + taxaEntrega - desconto).toFixed(2)}*\n\n`;

  mensagem += `📍 *ENDEREÇO:*\n`;
  mensagem += `${endereco}, ${numero}\n`;
  if (complemento) mensagem += `${complemento}\n`;
  mensagem += `${bairro}\n`;
  if (cep) mensagem += `CEP: ${cep}\n\n`;

  mensagem += `💳 *PAGAMENTO:* ${pagamento.toUpperCase()}\n`;

  if (pagamento === "credito" || pagamento === "debito") {
    const nomeCartao = document.getElementById("nomeCartao").value;
    const numeroCartao = document.getElementById("numeroCartao").value;
    if (nomeCartao && numeroCartao) {
      mensagem += `Nome: ${nomeCartao}\n`;
      mensagem += `Últimos dígitos: ${numeroCartao.slice(-4)}\n`;
    }
  }

  if (pagamento === "dinheiro") {
    const troco = document.getElementById("trocoValor").value;
    if (troco) {
      mensagem += `Troco para: R$ ${parseFloat(troco).toFixed(2)}\n`;
    }
  }

  if (obs) {
    mensagem += `\n📝 *OBSERVAÇÕES:*\n${obs}\n`;
  }

  mensagem += `\n✅ Pedido realizado em ${new Date().toLocaleString("pt-BR")}`;

  // Salvar no histórico com status
  const salvarEnderEscolha = document.getElementById("salvarEndereco");
  if (salvarEnderEscolha && salvarEnderEscolha.checked) {
    salvarEndereco(endereco, bairro, numero, cep, complemento);
  }
  
  // Adicionar pontos de fidelidade
  const totalPedido = total + taxaEntrega - desconto;
  adicionarPontos(totalPedido);
  
  historialPedidos.push({
    itens: carrinho,
    total: totalPedido,
    data: new Date(),
    status: "pendente",
    endereco: endereco,
    bairro: bairro
  });
  localStorage.setItem("historialPedidos", JSON.stringify(historialPedidos));

  // Enviar WhatsApp
  const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");

  // Limpar tudo
  setTimeout(() => {
    carrinho = [];
    desconto = 0;
    taxaEntrega = 0;
    total = 0;
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    
    atualizarCarrinho();
    fecharModal();
    mostrarNotificacao("✅ Pedido enviado com sucesso!");
  }, 500);
}

// ============ AVALIAÇÕES ============
function abrirAvaliacaoModal() {
  document.getElementById("avaliacaoModal").style.display = "flex";
}

function fecharAvaliacaoModal() {
  document.getElementById("avaliacaoModal").style.display = "none";
  document.getElementById("nomeAvaliacao").value = "";
  document.getElementById("textoAvaliacao").value = "";
  limparEstrelas();
}

let estrelasSelecionadas = 0;

function selecionarEstrela(numero) {
  estrelasSelecionadas = numero;
  const stars = document.querySelectorAll(".star");
  stars.forEach((star, index) => {
    if (index < numero) {
      star.classList.add("active");
    } else {
      star.classList.remove("active");
    }
  });
}

function limparEstrelas() {
  document.querySelectorAll(".star").forEach(star => {
    star.classList.remove("active");
  });
  estrelasSelecionadas = 0;
}

function enviarAvaliacao() {
  const nome = document.getElementById("nomeAvaliacao").value;
  const texto = document.getElementById("textoAvaliacao").value;

  if (!nome || !texto || estrelasSelecionadas === 0) {
    mostrarNotificacao("Preencha todos os campos e selecione uma nota.");
    return;
  }

  const avaliacao = {
    nome: nome,
    texto: texto,
    estrelas: estrelasSelecionadas,
    data: new Date()
  };

  // Aqui você poderia salvar em um banco de dados
  localStorage.setItem("ultimaAvaliacao", JSON.stringify(avaliacao));

  fecharAvaliacaoModal();
  mostrarNotificacao("✅ Obrigado por avaliar nosso serviço!");
}

function aplicarEstrelas() {
  let ultimaAvaliacao = null;
  try {
    const raw = localStorage.getItem("ultimaAvaliacao");
    if (raw) ultimaAvaliacao = JSON.parse(raw);
  } catch (e) {
    return;
  }
  if (ultimaAvaliacao) {
    const stars = document.querySelectorAll(".star");
    stars.forEach((star, index) => {
      if (index < ultimaAvaliacao.estrelas) {
        star.classList.add("active");
      }
    });
  }
}

// ============ NOTIFICAÇÕES ============
function mostrarNotificacao(mensagem) {
  const notif = document.createElement("div");
  notif.setAttribute("role", "status");
  notif.setAttribute("aria-live", "polite");
  notif.className = "app-toast";
  notif.textContent = mensagem;
  document.body.appendChild(notif);

  setTimeout(function () {
    notif.classList.add("app-toast--out");
    setTimeout(function () {
      notif.remove();
    }, 280);
  }, 3000);
}

// ============ CARREGAR DADOS INICIAIS ============
window.addEventListener("load", function () {
  verificarStatusLoja();
  atualizarPontosFidelidade();
});

// ============ SISTEMA DE PONTOS DE FIDELIDADE ============
function adicionarPontos(valor) {
  const pontos = Math.floor(valor * 0.5); // 0.5 ponto por real
  pontosFidelidade.total += pontos;
  
  // Definir nível baseado em pontos
  if (pontosFidelidade.total >= 1000) {
    pontosFidelidade.nivel = "Ouro";
  } else if (pontosFidelidade.total >= 500) {
    pontosFidelidade.nivel = "Prata";
  } else if (pontosFidelidade.total >= 200) {
    pontosFidelidade.nivel = "Bronze";
  }
  
  localStorage.setItem("pontosFidelidade", JSON.stringify(pontosFidelidade));
}

function atualizarPontosFidelidade() {
  const pontosEl = document.getElementById("pontos-fidelidade");
  if (pontosEl) {
    pontosEl.textContent = `${pontosFidelidade.nivel} | ${pontosFidelidade.total} pts`;
  }
}

function usarPontos() {
  if (pontosFidelidade.total < 100) {
    mostrarNotificacao("❌ Você precisa de 100 pontos para usar!");
    return;
  }
  
  const descontoEmPontos = pontosFidelidade.total / 100 * 5; // 5 reais a cada 100 pontos
  desconto += descontoEmPontos;
  pontosFidelidade.total -= 100;
  
  localStorage.setItem("pontosFidelidade", JSON.stringify(pontosFidelidade));
  atualizarResumoModal();
  atualizarCarrinho();
  mostrarNotificacao(`🎁 Desconto de R$ ${descontoEmPontos.toFixed(2)} aplicado!`);
}

// ============ ENDEREÇOS SALVOS ============
function salvarEndereco(endereco, bairro, numero, cep, complemento = "") {
  const novoEndereco = {
    id: Date.now(),
    endereco,
    bairro,
    numero,
    cep,
    complemento,
    dataSalvo: new Date()
  };
  
  enderecosSalvos.push(novoEndereco);
  localStorage.setItem("enderecosSalvos", JSON.stringify(enderecosSalvos));
  mostrarNotificacao("✅ Endereço salvo com sucesso!");
}

function carregarEnderecoSalvo(id) {
  const endereco = enderecosSalvos.find(e => e.id === id);
  if (endereco) {
    document.getElementById("endereco").value = endereco.endereco;
    document.getElementById("bairro").value = endereco.bairro;
    document.getElementById("numero").value = endereco.numero;
    document.getElementById("cep").value = endereco.cep;
    document.getElementById("complemento").value = endereco.complemento;
  }
}

function listarEnderecosSalvos() {
  let html = "<h3>Endereços Salvos:</h3>";
  if (enderecosSalvos.length === 0) {
    return "<p>Nenhum endereço salvo ainda.</p>";
  }
  
  enderecosSalvos.forEach(end => {
    html += `<div style="padding: 10px; border: 1px solid #444; margin: 5px 0; border-radius: 5px; cursor: pointer;" onclick="carregarEnderecoSalvo(${end.id})">
      ${end.endereco}, ${end.numero} - ${end.bairro}
      <button type="button" onclick="event.stopPropagation(); removerEndereco(${end.id})" style="float: right; background: #c00; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer;">Remover</button>
    </div>`;
  });
  
  return html;
}

function removerEndereco(id) {
  enderecosSalvos = enderecosSalvos.filter(e => e.id !== id);
  localStorage.setItem("enderecosSalvos", JSON.stringify(enderecosSalvos));
  const listEl = document.getElementById("enderecos-salvos-list");
  if (listEl) {
    listEl.innerHTML = listarEnderecosSalvos();
  }
  mostrarNotificacao("❌ Endereço removido!");
}

// ============ ÚLTIMO PEDIDO / QUICK REORDER ============
function abrirUltimoPedido() {
  if (historialPedidos.length === 0) {
    mostrarNotificacao("📦 Você ainda não fez nenhum pedido!");
    return;
  }
  
  const ultimoPedido = historialPedidos[historialPedidos.length - 1];
  const modal = document.createElement("div");
  modal.className = "modal modal-dinamico";
  modal.style.display = "flex";
  
  let itensHtml = "";
  ultimoPedido.itens.forEach(item => {
    itensHtml += `<div style="padding: 8px; border-bottom: 1px solid #444;">
      ${item.nome} - R$ ${item.preco.toFixed(2)}
    </div>`;
  });
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <h2>🕐 Seu Último Pedido</h2>
      <p style="color: #999; font-size: 0.9rem;">
        ${new Date(ultimoPedido.data).toLocaleDateString("pt-BR")}
      </p>
      <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin: 15px 0;">
        ${itensHtml}
      </div>
      <p><strong>Total:</strong> R$ ${ultimoPedido.total.toFixed(2)}</p>
      <button onclick="repetiUltimoPedido()" class="btn" style="width: 100%; margin-top: 15px;">🔄 Repetir Pedido</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

function repetiUltimoPedido() {
  if (historialPedidos.length === 0) return;
  
  const ultimoPedido = historialPedidos[historialPedidos.length - 1];
  carrinho = [];
  
  ultimoPedido.itens.forEach(item => {
    carrinho.push({
      nome: item.nome,
      preco: item.preco,
      quantidade: 1,
      id: Date.now() + Math.random()
    });
  });
  
  atualizarCarrinho();
  document.querySelectorAll(".modal-dinamico").forEach((m) => m.remove());
  mostrarNotificacao("🔄 Itens do último pedido adicionados ao carrinho!");
}

// ============ HORÁRIO DE FUNCIONAMENTO ============
function verificarStatusLoja() {
  const agora = new Date();
  const dia = agora.getDay(); // 0 = domingo, 6 = sábado
  const hora = agora.getHours();
  
  // Seg-Dom: 10h às 23h | Domingos: 11h às 22h
  let aberto = false;
  let mensagem = "";
  
  if (dia === 0) { // Domingo
    aberto = hora >= 11 && hora < 22;
    mensagem = "Dom: 11h - 22h";
  } else {
    aberto = hora >= 10 && hora < 23;
    mensagem = "Seg-Sab: 10h - 23h";
  }
  
  const statusEl = document.getElementById("status-loja");
  if (statusEl) {
    statusEl.innerHTML = aberto ? 
      `<span style="color: #4ade80;">🟢 ABERTO</span> | ${mensagem}` :
      `<span style="color: #ef4444;">🔴 FECHADO</span> | ${mensagem}`;
  }
}

// ============ RASTREAMENTO DE PEDIDOS ============
function abrirRastreamento() {
  if (!usuario) {
    mostrarNotificacao("❌ Faça login para rastrear pedidos!");
    return;
  }
  
  const modal = document.createElement("div");
  modal.className = "modal modal-dinamico";
  modal.style.display = "flex";
  
  let conteudo = "<h2>📦 Rastreamento de Pedidos</h2>";
  
  if (historialPedidos.length === 0) {
    conteudo += "<p>Nenhum pedido encontrado.</p>";
  } else {
    historialPedidos.slice().reverse().forEach((pedido, index) => {
      const statusTexto = {
        "pendente": "⏳ Pendente",
        "confirmado": "✅ Confirmado",
        "preparando": "👨‍🍳 Preparando",
        "entregando": "🚗 Em Entrega",
        "entregue": "🎉 Entregue"
      };
      
      conteudo += `
        <div style="background: #1a1a1a; padding: 15px; margin: 10px 0; border-left: 4px solid orange; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Pedido #${historialPedidos.length - index}</strong>
              <p style="font-size: 0.9rem; color: #999;">
                ${new Date(pedido.data).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div style="text-align: right;">
              <p>${statusTexto[pedido.status] || "⏳ Pendente"}</p>
              <p style="color: orange; font-weight: bold;">R$ ${pedido.total.toFixed(2)}</p>
            </div>
          </div>
        </div>
      `;
    });
  }
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
      ${conteudo}
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// ============ NOTIFICAÇÃO FLUTUANTE COM STATUS ============
function notificarStatusPedido(numero, status) {
  const statusEmoji = {
    "confirmado": "✅",
    "preparando": "👨‍🍳",
    "entregando": "🚗",
    "entregue": "🎉"
  };
  
  mostrarNotificacao(`${statusEmoji[status] || "📦"} Pedido #${numero} - ${status.toUpperCase()}`);
}