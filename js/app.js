// Aurora — estudo diário. Sem dependências; o progresso fica no aparelho (localStorage).

const DIAS = ["seg", "ter", "qua", "qui", "sex"];
const NOME_DIA = { seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta" };
const CHAVE = "aurora.v1";
const app = document.getElementById("app");

let curriculo = null;
const cacheSemanas = new Map();

// ---------- Estado ----------

function lerEstado() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE));
    if (bruto && typeof bruto === "object") return { licoes: {}, sextas: {}, ...bruto };
  } catch { /* armazenamento indisponível */ }
  return { licoes: {}, sextas: {} };
}
let estado = lerEstado();

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); }
  catch { toast("Não foi possível salvar neste aparelho."); }
}

const licaoEstado = (s, d) => (estado.licoes[`${s}-${d}`] ??= {});
const sextaEstado = (s) => (estado.sextas[s] ??= {});

// ---------- Datas ----------

function isoLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function deISO(s) {
  const [a, m, d] = s.split("-").map(Number);
  return new Date(a, m - 1, d);
}
function posicao(agora = new Date()) {
  const inicio = deISO(curriculo.inicio);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const delta = Math.round((hoje - inicio) / 86400000);
  const sem = hoje.getDay();
  const dia = sem >= 1 && sem <= 5 ? DIAS[sem - 1] : null;
  if (delta < 0) return { semana: 1, dia: null, antes: true, faltam: -delta };
  return { semana: Math.floor(delta / 7) + 1, dia, antes: false };
}
const liberada = (s) => s <= posicao().semana;
const dataExtenso = (d, opts) => new Intl.DateTimeFormat("pt-BR", opts).format(d);

// ---------- Conteúdo ----------

async function carregarCurriculo() {
  const r = await fetch("content/curriculo.json");
  curriculo = await r.json();
}

async function carregarSemana(n) {
  if (cacheSemanas.has(n)) return cacheSemanas.get(n);
  let dados = null;
  try {
    const r = await fetch(`content/semanas/semana-${String(n).padStart(2, "0")}.json`);
    if (r.ok) dados = await r.json();
  } catch { /* offline e sem cache */ }
  cacheSemanas.set(n, dados);
  return dados;
}

function moduloDaSemana(n) {
  return curriculo.modulos.find((m) => m.semanas.some((s) => s.numero === n));
}
function infoSemana(n) {
  return moduloDaSemana(n)?.semanas.find((s) => s.numero === n);
}

// ---------- Utilidades ----------

function esc(t = "") {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function md(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}
function paragrafos(lista) {
  return lista.map((p) => (p.startsWith("## ") ? `<h3>${md(p.slice(3))}</h3>` : `<p>${md(p)}</p>`)).join("");
}
function contarPalavras(t = "") {
  return (t.trim().match(/\S+/g) || []).length;
}
function debounce(fn, ms = 500) {
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
}
function toast(msg) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ---------- Progresso ----------

function diasComEstudo() {
  const dias = new Set();
  for (const l of Object.values(estado.licoes)) if (l.concluida) dias.add(l.concluida);
  for (const s of Object.values(estado.sextas)) if (s.finalizado) dias.add(s.finalizado);
  return dias;
}

// Sequência de dias úteis seguidos com estudo. Hoje ainda sem estudo não quebra a sequência.
function sequencia() {
  const dias = diasComEstudo();
  const d = new Date();
  if (!dias.has(isoLocal(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const sem = d.getDay();
    if (sem !== 0 && sem !== 6) {
      if (!dias.has(isoLocal(d))) break;
      n++;
    }
    d.setDate(d.getDate() - 1);
  }
  return n;
}

const feito = (s, d) => d === "sex" ? !!estado.sextas[s]?.finalizado : !!estado.licoes[`${s}-${d}`]?.concluida;

function faixaSemana(s, dados, diaHoje) {
  return `<div class="semana-faixa">${DIAS.map((d) => {
    const disc = curriculo.dias[d];
    const href = d === "sex" ? `#/sexta/${s}` : `#/licao/${s}/${d}`;
    const cls = ["dia", feito(s, d) && "feito", d === diaHoje && "hoje", (!dados || !liberada(s)) && "bloqueado"].filter(Boolean).join(" ");
    return `<a class="${cls}" href="${href}" data-disc="${disc}">
      <span class="bolinha">${feito(s, d) ? "✓" : NOME_DIA[d][0]}</span>
      <span>${NOME_DIA[d].slice(0, 3)}</span>
    </a>`;
  }).join("")}</div>`;
}

function semConteudo(s) {
  const info = infoSemana(s);
  return `<div class="card">
    <p class="sobretitulo">Semana ${s}${info ? ` · ${esc(info.tema)}` : ""}</p>
    <h2>Em preparação</h2>
    <p class="muted">O conteúdo desta semana ainda não foi escrito. Peça ao Claude no projeto:
    <em>"gere a semana ${s} do Aurora"</em>.</p>
  </div>`;
}

// ---------- Telas ----------

async function telaHoje() {
  const agora = new Date();
  const pos = posicao(agora);
  const dados = await carregarSemana(pos.semana);
  const hora = agora.getHours();
  const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const modulo = moduloDaSemana(pos.semana);

  let principal;
  if (!dados) {
    principal = semConteudo(pos.semana);
  } else if (pos.antes) {
    const l = dados.licoes[0];
    principal = `
      <div class="card">
        <p class="muted" style="margin:0">Sua jornada começa em ${plural(pos.faltam, "dia", "dias")},
        ${dataExtenso(deISO(curriculo.inicio), { weekday: "long", day: "numeric", month: "long" })}.
        Se quiser, já pode começar.</p>
      </div>
      ${cartaoLicao(1, l)}`;
  } else if (pos.dia && pos.dia !== "sex") {
    principal = cartaoLicao(pos.semana, dados.licoes.find((l) => l.dia === pos.dia));
  } else if (pos.dia === "sex" || !estado.sextas[pos.semana]?.finalizado) {
    principal = cartaoSexta(pos.semana, dados, !pos.dia);
  } else {
    const prox = infoSemana(pos.semana + 1);
    principal = `<div class="card">
      <p class="sobretitulo">Fim de semana</p>
      <h2>Descanse. Você fechou a semana.</h2>
      ${prox ? `<p class="muted">Segunda começa: <strong>${esc(prox.tema)}</strong>.</p>` : ""}
    </div>`;
  }

  const pendentes = dados && !pos.antes
    ? DIAS.slice(0, Math.max(0, DIAS.indexOf(pos.dia ?? "sex")))
        .filter((d) => d !== "sex" && !feito(pos.semana, d))
    : [];

  app.innerHTML = `
    <header class="saudacao">
      <p class="sobretitulo">${dataExtenso(agora, { weekday: "long", day: "numeric", month: "long" })}</p>
      <h1>${saud}.</h1>
      ${dados ? `<p class="muted">Semana ${pos.semana} · ${esc(dados.tema)}</p>` : ""}
    </header>

    <div class="pilha">${principal}</div>

    ${pushSuportado() && Notification.permission === "default" ? `<a class="card destaque secao" href="#/diario" style="display:block">
      <span class="tag">Notificação</span>
      <p style="margin:6px 0 0">Quer receber a lição às 07:00? <strong>Ativar no Diário ›</strong></p>
    </a>` : ""}

    ${dados ? `<section class="secao">
      <p class="sobretitulo">Esta semana${modulo ? ` · Módulo ${modulo.numero}: ${esc(modulo.titulo)}` : ""}</p>
      ${faixaSemana(pos.semana, dados, pos.dia)}
      ${pendentes.length ? `<p class="muted pequeno" style="margin-top:12px">Ficou para trás: ${pendentes.map((d) =>
        `<a href="#/licao/${pos.semana}/${d}">${NOME_DIA[d]}</a>`).join(", ")}. Sem culpa: dá para recuperar.</p>` : ""}
    </section>` : ""}

    <section class="secao numeros">
      <div class="card numero"><strong>${sequencia()}</strong><span>dias seguidos</span></div>
      <div class="card numero"><strong>${Object.values(estado.licoes).filter((l) => l.concluida).length}</strong><span>lições</span></div>
      <div class="card numero"><strong>${Object.values(estado.sextas).filter((s) => s.finalizado).length}</strong><span>textos</span></div>
    </section>`;
}

function cartaoLicao(s, l) {
  const ok = feito(s, l.dia);
  return `<a class="card destaque" href="#/licao/${s}/${l.dia}" data-disc="${esc(l.disciplina)}">
    <span class="tag">${esc(l.disciplina)}</span>
    <h2>${esc(l.titulo)}</h2>
    <p class="muted" style="margin:0">${esc(l.subtitulo)}</p>
    <div class="meta">
      <span class="muted pequeno">${l.minutos} min de leitura</span>
      <span class="botao ${ok ? "sec" : ""}">${ok ? "Reler" : "Começar"}</span>
    </div>
  </a>`;
}

function cartaoSexta(s, dados, fimDeSemana) {
  const st = estado.sextas[s] || {};
  const n = contarPalavras(st.texto);
  return `<a class="card destaque" href="#/sexta/${s}" data-disc="Escrita">
    <span class="tag">${fimDeSemana ? "Texto da semana pendente" : "Dia de escrever"}</span>
    <h2>${esc(dados.sexta.titulo)}</h2>
    <p class="muted" style="margin:0">Mínimo de ${dados.sexta.palavras_minimas} palavras costurando as quatro lições.</p>
    <div class="meta">
      <span class="muted pequeno">${n ? `${n} palavras no rascunho` : "Ainda em branco"}</span>
      <span class="botao">${n ? "Continuar" : "Escrever"}</span>
    </div>
  </a>`;
}

async function telaLicao(s, dia) {
  if (!liberada(s)) return telaBloqueada(s);
  const dados = await carregarSemana(s);
  if (!dados) { app.innerHTML = voltar() + semConteudo(s); return; }
  const l = dados.licoes.find((x) => x.dia === dia);
  if (!l) return irPara("#/");
  const st = licaoEstado(s, dia);

  app.innerHTML = `
    ${voltar(`#/semana/${s}`, `Semana ${s}`)}
    <article data-disc="${esc(l.disciplina)}">
      <header class="cabecalho-licao">
        <span class="tag">${NOME_DIA[dia]} · ${esc(l.disciplina)} · ${l.minutos} min</span>
        <h1>${esc(l.titulo)}</h1>
        <p class="muted">${esc(l.subtitulo)}</p>
      </header>

      <div class="leitura">${paragrafos(l.texto)}</div>

      ${l.trecho ? `<blockquote class="trecho">“${md(l.trecho.texto)}”<footer>${esc(l.trecho.fonte)}</footer></blockquote>` : ""}

      <section class="card conceitos">
        <p class="sobretitulo">Conceitos-chave</p>
        <dl>${l.conceitos.map((c) => `<dt>${esc(c.termo)}</dt><dd>${md(c.definicao)}</dd>`).join("")}</dl>
      </section>

      <section class="secao card">
        <p class="sobretitulo">Desafie-se</p>
        ${l.quiz.map((q, i) => `<div class="quiz-q" data-q="${i}">
          <p>${md(q.pergunta)}</p>
          ${q.opcoes.map((o, j) => `<button class="opcao" data-o="${j}">${md(o)}</button>`).join("")}
          <div class="explicacao" hidden>${md(q.explicacao)}</div>
        </div>`).join("")}
      </section>

      <section class="secao card reflexao">
        <p class="sobretitulo">Para refletir</p>
        <ol>${l.reflexao.map((r) => `<li>${md(r)}</li>`).join("")}</ol>
        <textarea id="notas" placeholder="Escreva o que vier. Ninguém mais lê isto.">${esc(st.notas || "")}</textarea>
      </section>

      <section class="secao card">
        <p class="sobretitulo">Prática de hoje</p>
        <h3>${esc(l.desafio.titulo)}</h3>
        <p class="muted">${md(l.desafio.descricao)}</p>
        <label class="check"><input type="checkbox" id="desafio" ${st.desafio ? "checked" : ""}> Fiz a prática</label>
      </section>

      ${l.ponte ? `<p class="secao ponte">${md(l.ponte)}</p>` : ""}

      <div class="secao" id="rodape"></div>
    </article>`;

  // Quiz: uma tentativa por pergunta, a resposta fica registrada.
  st.quiz ??= {};
  app.querySelectorAll(".quiz-q").forEach((bloco) => {
    const i = Number(bloco.dataset.q);
    const q = l.quiz[i];
    const marcar = (escolha) => {
      bloco.querySelectorAll(".opcao").forEach((b) => {
        const j = Number(b.dataset.o);
        b.disabled = true;
        if (j === q.correta) b.classList.add("certa");
        else if (j === escolha) b.classList.add("errada");
      });
      bloco.querySelector(".explicacao").hidden = false;
    };
    if (st.quiz[i] !== undefined) marcar(st.quiz[i]);
    bloco.addEventListener("click", (e) => {
      const b = e.target.closest(".opcao");
      if (!b || b.disabled) return;
      st.quiz[i] = Number(b.dataset.o);
      salvar();
      marcar(st.quiz[i]);
    });
  });

  app.querySelector("#notas").addEventListener("input", debounce((e) => { st.notas = e.target.value; salvar(); }));
  app.querySelector("#desafio").addEventListener("change", (e) => { st.desafio = e.target.checked; salvar(); });

  const rodape = app.querySelector("#rodape");
  const proximo = DIAS[DIAS.indexOf(dia) + 1];
  const linkProx = proximo === "sex" ? `#/sexta/${s}` : `#/licao/${s}/${proximo}`;
  const desenharRodape = () => {
    rodape.innerHTML = st.concluida
      ? `<div class="concluida-selo">✓ Concluída em ${dataExtenso(deISO(st.concluida), { day: "numeric", month: "long" })}</div>
         <div class="botoes"><a class="botao sec largo" href="${linkProx}">Próxima: ${NOME_DIA[proximo]}</a>
         <a class="botao largo" href="#/">Voltar para hoje</a></div>`
      : `<button class="botao largo" id="concluir">Concluir lição</button>`;
    rodape.querySelector("#concluir")?.addEventListener("click", () => {
      st.concluida = isoLocal();
      salvar();
      toast("Lição concluída. Bom trabalho.");
      desenharRodape();
    });
  };
  desenharRodape();
}

function promptFeedback(dados, texto) {
  return `Estou num programa pessoal de estudos de filosofia, literatura, neurociência e espiritualidade. Toda sexta escrevo um texto sobre o que aprendi na semana.

Semana ${dados.semana}: ${dados.tema}
Lições: ${dados.licoes.map((l) => `${l.disciplina} — ${l.titulo} (${l.subtitulo})`).join("; ")}

Proposta: ${dados.sexta.proposta}

Meu texto:
"""
${texto}
"""

Me dê um feedback honesto e desafiador, sem elogio vazio:
1. O que está mais forte no texto.
2. Onde o raciocínio está superficial ou frágil.
3. Algum conceito que usei de forma imprecisa (corrija com clareza).
4. Uma pergunta que me empurre a pensar mais fundo.
5. Uma leitura curta (um trecho, conto ou ensaio) para aprofundar.`;
}

async function telaSexta(s) {
  if (!liberada(s)) return telaBloqueada(s);
  const dados = await carregarSemana(s);
  if (!dados) { app.innerHTML = voltar() + semConteudo(s); return; }
  const sx = dados.sexta;
  const st = sextaEstado(s);
  st.criterios ??= [];

  app.innerHTML = `
    ${voltar(`#/semana/${s}`, `Semana ${s}`)}
    <article data-disc="Escrita">
      <header class="cabecalho-licao">
        <span class="tag">Sexta · Escrita</span>
        <h1>${esc(sx.titulo)}</h1>
        <p class="muted">Semana ${s} · ${esc(dados.tema)}</p>
      </header>

      <div class="leitura"><p>${md(sx.proposta)}</p></div>

      <section class="card guia">
        <p class="sobretitulo">Perguntas-guia</p>
        <ol>${sx.perguntas_guia.map((p) => `<li>${md(p)}</li>`).join("")}</ol>
        <p class="muted pequeno" style="margin:0">Esta semana: ${dados.licoes.map((l) =>
          `<a href="#/licao/${s}/${l.dia}">${esc(l.titulo)}</a>`).join(" · ")}</p>
      </section>

      <section class="secao">
        <textarea id="texto" class="grande" placeholder="Comece por onde quiser. Depois você organiza.">${esc(st.texto || "")}</textarea>
        <div class="contador"><span id="contagem"></span><span id="salvo"></span></div>
      </section>

      <section class="secao card">
        <p class="sobretitulo">Antes de finalizar, confira</p>
        ${sx.criterios.map((c, i) => `<label class="check"><input type="checkbox" data-c="${i}" ${st.criterios[i] ? "checked" : ""}> ${md(c)}</label>`).join("")}
      </section>

      <div class="secao botoes" id="acoes"></div>
    </article>`;

  const area = app.querySelector("#texto");
  const contagem = app.querySelector("#contagem");
  const salvo = app.querySelector("#salvo");
  const atualizarContagem = () => {
    const n = contarPalavras(area.value);
    contagem.innerHTML = n >= sx.palavras_minimas
      ? `<span class="ok">${n} palavras ✓</span>`
      : `${n} de ${sx.palavras_minimas} palavras`;
  };
  atualizarContagem();
  area.addEventListener("input", atualizarContagem);
  area.addEventListener("input", debounce(() => {
    st.texto = area.value;
    st.atualizado = new Date().toISOString();
    salvar();
    salvo.textContent = "rascunho salvo";
  }, 700));

  app.querySelectorAll("[data-c]").forEach((cb) =>
    cb.addEventListener("change", () => { st.criterios[Number(cb.dataset.c)] = cb.checked; salvar(); }));

  const acoes = app.querySelector("#acoes");
  const desenharAcoes = () => {
    acoes.innerHTML = `
      ${st.finalizado
        ? `<div class="concluida-selo">✓ Texto finalizado em ${dataExtenso(deISO(st.finalizado), { day: "numeric", month: "long" })}</div>`
        : `<button class="botao largo" id="finalizar">Finalizar texto</button>`}
      <button class="botao sec largo" id="feedback">Pedir feedback ao Claude</button>
      <p class="muted pequeno" style="margin:0;text-align:center">Prepara seu texto com um pedido de crítica, para colar no app do Claude.</p>`;

    acoes.querySelector("#finalizar")?.addEventListener("click", () => {
      st.texto = area.value;
      const n = contarPalavras(st.texto);
      if (n < sx.palavras_minimas && !confirm(`Seu texto tem ${n} palavras (meta: ${sx.palavras_minimas}). Finalizar mesmo assim?`)) return;
      st.finalizado = isoLocal();
      salvar();
      toast("Texto guardado no Diário.");
      desenharAcoes();
    });

    acoes.querySelector("#feedback").addEventListener("click", async () => {
      st.texto = area.value;
      salvar();
      if (contarPalavras(st.texto) < 30) return toast("Escreva um pouco mais antes de pedir feedback.");
      const pedido = promptFeedback(dados, st.texto);
      try {
        if (navigator.share) await navigator.share({ text: pedido });
        else { await navigator.clipboard.writeText(pedido); toast("Copiado. Cole numa conversa com o Claude."); }
      } catch (e) {
        if (e?.name !== "AbortError") {
          try { await navigator.clipboard.writeText(pedido); toast("Copiado. Cole numa conversa com o Claude."); }
          catch { toast("Não consegui copiar automaticamente."); }
        }
      }
    });
  };
  desenharAcoes();
}

async function telaSemana(s) {
  if (!liberada(s)) return telaBloqueada(s);
  const dados = await carregarSemana(s);
  const mod = moduloDaSemana(s);
  if (!dados) { app.innerHTML = voltar("#/trilha", "Trilha") + semConteudo(s); return; }
  app.innerHTML = `
    ${voltar("#/trilha", "Trilha")}
    <header class="saudacao">
      <p class="sobretitulo">Módulo ${mod.numero} · Semana ${s}</p>
      <h1>${esc(dados.tema)}</h1>
      <p class="muted">${md(dados.introducao)}</p>
    </header>
    ${faixaSemana(s, dados, s === posicao().semana ? posicao().dia : null)}
    <div class="secao pilha">
      ${dados.licoes.map((l) => cartaoLicao(s, l)).join("")}
      ${cartaoSexta(s, dados, false)}
    </div>`;
}

function telaBloqueada(s) {
  const info = infoSemana(s);
  app.innerHTML = `${voltar("#/trilha", "Trilha")}
    <div class="card">
      <p class="sobretitulo">Semana ${s}</p>
      <h2>${esc(info?.tema || "Ainda não chegou")}</h2>
      <p class="muted">Esta semana abre na hora certa. Constância vale mais do que pressa.</p>
    </div>`;
}

function telaTrilha() {
  const atual = posicao().semana;
  app.innerHTML = `
    <header class="saudacao">
      <p class="sobretitulo">Sua trilha</p>
      <h1>Do "conhece-te a ti mesmo" a Nietzsche</h1>
      <p class="muted">${curriculo.modulos.length} módulos, quatro semanas cada. A complexidade sobe aos poucos.</p>
    </header>
    <div class="pilha">
      ${curriculo.modulos.map((m) => {
        const total = m.semanas.length * 5;
        const feitos = m.semanas.reduce((acc, s) => acc + DIAS.filter((d) => feito(s.numero, d)).length, 0);
        const futuro = m.semanas[0].numero > atual;
        return `<section class="card modulo ${futuro ? "futuro" : ""}">
          <p class="sobretitulo">Módulo ${m.numero}</p>
          <h3>${esc(m.titulo)}</h3>
          <p class="muted pequeno" style="margin:0">${esc(m.descricao)}</p>
          ${futuro ? "" : `<div class="barra"><i style="width:${Math.round((feitos / total) * 100)}%"></i></div>`}
          <ul class="semana-lista">${m.semanas.map((s) => {
            const n = DIAS.filter((d) => feito(s.numero, d)).length;
            const status = s.numero > atual ? "🔒" : s.numero === atual ? "agora" : `${n}/5`;
            const corpo = `<span>Semana ${s.numero}: ${esc(s.tema)}<small>${s.destaques.map(esc).join(" · ")}</small></span><span class="status">${status}</span>`;
            return `<li>${s.numero > atual ? `<div class="sem-link">${corpo}</div>` : `<a href="#/semana/${s.numero}">${corpo}</a>`}</li>`;
          }).join("")}</ul>
        </section>`;
      }).join("")}
    </div>`;
}

function telaDiario() {
  const textos = Object.entries(estado.sextas)
    .filter(([, s]) => s.texto?.trim())
    .sort(([a], [b]) => Number(b) - Number(a));

  app.innerHTML = `
    <header class="saudacao">
      <p class="sobretitulo">Diário</p>
      <h1>O que você já pensou</h1>
    </header>
    <div class="pilha">
      ${textos.length ? textos.map(([s, st]) => {
        const info = infoSemana(Number(s));
        return `<article class="card entrada">
          <p class="sobretitulo">Semana ${s} · ${st.finalizado ? dataExtenso(deISO(st.finalizado), { day: "numeric", month: "short", year: "numeric" }) : "rascunho"}</p>
          <h3>${esc(info?.tema || "")}</h3>
          <div class="texto">${esc(st.texto)}</div>
          <div class="botoes" style="flex-direction:row;margin-top:12px">
            <button class="botao sec" data-expandir>Ler tudo</button>
            <a class="botao sec" href="#/sexta/${s}">Abrir</a>
          </div>
        </article>`;
      }).join("") : `<div class="card vazio">Seus textos de sexta aparecem aqui.<br>O primeiro está a uma semana de distância.</div>`}
    </div>

    <section class="secao card">
      <p class="sobretitulo">Notificação das 07:00</p>
      <p class="muted pequeno" id="notif-status">Verificando…</p>
      <div class="botoes" id="notif-acoes"></div>
    </section>

    <section class="secao card">
      <p class="sobretitulo">Seus dados</p>
      <p class="muted pequeno">Tudo fica salvo só neste aparelho. Faça um backup de vez em quando, principalmente antes de trocar de celular ou limpar o navegador.</p>
      <div class="botoes">
        <button class="botao sec largo" id="exportar">Exportar backup</button>
        <label class="botao sec largo">Importar backup<input type="file" id="importar" accept="application/json,.json" hidden></label>
      </div>
    </section>`;

  app.querySelectorAll("[data-expandir]").forEach((b) => b.addEventListener("click", () => {
    const art = b.closest(".entrada");
    art.classList.toggle("aberta");
    b.textContent = art.classList.contains("aberta") ? "Recolher" : "Ler tudo";
  }));

  painelNotificacoes();

  app.querySelector("#exportar").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "aurora", versao: 1, exportado: new Date().toISOString(), estado }, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `aurora-backup-${isoLocal()}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  app.querySelector("#importar").addEventListener("change", async (e) => {
    const arq = e.target.files[0];
    if (!arq) return;
    try {
      const dados = JSON.parse(await arq.text());
      if (dados.app !== "aurora" || !dados.estado?.licoes) throw new Error();
      if (!confirm("Substituir o progresso deste aparelho pelo backup?")) return;
      estado = { licoes: {}, sextas: {}, ...dados.estado };
      salvar();
      toast("Backup restaurado.");
      telaDiario();
    } catch {
      toast("Arquivo de backup inválido.");
    }
  });
}

// ---------- Notificações (Web Push) ----------

const pushSuportado = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function chaveVapid(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function compartilharTexto(texto, msgCopiado) {
  try {
    if (navigator.share) return await navigator.share({ text: texto });
  } catch (e) {
    if (e?.name === "AbortError") return;
  }
  try { await navigator.clipboard.writeText(texto); toast(msgCopiado); }
  catch { toast("Não consegui copiar automaticamente."); }
}

async function painelNotificacoes() {
  const status = app.querySelector("#notif-status");
  const acoes = app.querySelector("#notif-acoes");
  if (!status) return;

  if (!pushSuportado()) {
    status.textContent = "Este navegador não permite notificações. Abra o Aurora pelo Chrome e instale na tela inicial.";
    acoes.innerHTML = "";
    return;
  }
  if (Notification.permission === "denied") {
    status.textContent = "As notificações foram bloqueadas. Libere em Configurações do Android → Apps → Aurora (ou Chrome) → Notificações, e volte aqui.";
    acoes.innerHTML = "";
    return;
  }

  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 8000))]);
  if (!reg) {
    status.textContent = "O app ainda está terminando de instalar. Feche e abra o Aurora de novo, com internet.";
    acoes.innerHTML = "";
    return;
  }
  const inscricao = await reg.pushManager.getSubscription();

  if (!inscricao) {
    status.textContent = "Receba a lição do dia no celular, de segunda a sexta, por volta das 07:00.";
    acoes.innerHTML = `<button class="botao largo" id="ativar">Ativar notificações</button>`;
    acoes.querySelector("#ativar").addEventListener("click", async () => {
      if ((await Notification.requestPermission()) !== "granted") return painelNotificacoes();
      try {
        await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveVapid(curriculo.vapid_publica) });
        toast("Ativado. Agora envie o código de ativação.");
      } catch {
        toast("Não foi possível ativar. Tente de novo com internet.");
      }
      painelNotificacoes();
    });
    return;
  }

  status.innerHTML = `Ativadas neste aparelho. Para o envio diário funcionar, mande o <strong>código de ativação</strong> ao Claude uma vez (e de novo só se reinstalar o app).`;
  acoes.innerHTML = `
    <button class="botao largo" id="codigo">Enviar código de ativação</button>
    <button class="botao sec largo" id="testar">Testar notificação aqui</button>`;
  acoes.querySelector("#codigo").addEventListener("click", () =>
    compartilharTexto(`Código de ativação do Aurora:\n${JSON.stringify(inscricao)}`, "Código copiado. Cole na conversa com o Claude."));
  acoes.querySelector("#testar").addEventListener("click", () =>
    reg.showNotification("Aurora", {
      body: "É assim que a lição vai chegar de manhã.",
      icon: "icons/icon-192.png",
      badge: "icons/badge-96.png",
      tag: "aurora-teste",
      data: { rota: "#/" },
    }));
}

function voltar(href = "#/", rotulo = "Hoje") {
  return `<a class="voltar" href="${href}">‹ ${esc(rotulo)}</a>`;
}

// ---------- Roteamento ----------

function irPara(hash) { location.hash = hash; }

async function rotear() {
  const partes = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [rota, a, b] = partes;
  const aba = { trilha: "trilha", semana: "trilha", diario: "diario" }[rota] || "hoje";
  document.querySelectorAll(".nav a").forEach((el) => el.classList.toggle("ativo", el.dataset.rota === aba));

  if (rota === "licao" && DIAS.includes(b)) await telaLicao(Number(a), b);
  else if (rota === "sexta") await telaSexta(Number(a));
  else if (rota === "semana") await telaSemana(Number(a));
  else if (rota === "trilha") telaTrilha();
  else if (rota === "diario") telaDiario();
  else await telaHoje();
  window.scrollTo(0, 0);
}

async function iniciar() {
  try {
    await carregarCurriculo();
  } catch {
    app.innerHTML = `<div class="card vazio">Não consegui carregar o conteúdo. Verifique a conexão e abra de novo.</div>`;
    return;
  }
  window.addEventListener("hashchange", rotear);
  await rotear();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  navigator.storage?.persist?.().catch(() => {});
}

iniciar();
