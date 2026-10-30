// Envia a notificação do dia pelo ntfy (https://ntfy.sh).
// Variáveis: NTFY_TOPIC (obrigatória), APP_URL (endereço do app publicado), NTFY_SERVER (opcional).
// Uso local para testar: NTFY_TOPIC=meu-topico APP_URL=https://... node scripts/notificar.mjs
import { readFileSync, existsSync } from "node:fs";

const DIAS = ["seg", "ter", "qua", "qui", "sex"];
const topico = process.env.NTFY_TOPIC;
const appUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/?$/, "/") : "";
const servidor = process.env.NTFY_SERVER || "https://ntfy.sh";
const ensaio = process.env.DRY_RUN === "1";
// TESTE=1 envia mesmo antes do início ou no fim de semana (usa a segunda da semana 1).
const teste = process.env.TESTE === "1";

if (!topico && !ensaio) {
  console.error("Defina NTFY_TOPIC.");
  process.exit(1);
}

// Data de hoje no fuso de São Paulo, independente do relógio do servidor.
const partes = Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
    .formatToParts(new Date())
    .map((p) => [p.type, p.value])
);
const hoje = Date.UTC(+partes.year, +partes.month - 1, +partes.day);
let semanaDia = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 }[partes.weekday];
if (semanaDia === undefined && teste) semanaDia = 0;
if (semanaDia === undefined) {
  console.log("Fim de semana: nada a enviar.");
  process.exit(0);
}

const curriculo = JSON.parse(readFileSync("content/curriculo.json", "utf8"));
const [a, m, d] = curriculo.inicio.split("-").map(Number);
let delta = Math.round((hoje - Date.UTC(a, m - 1, d)) / 86400000);
if (delta < 0 && teste) delta = 0;
if (delta < 0) {
  console.log(`A jornada começa em ${curriculo.inicio}.`);
  process.exit(0);
}

const semana = Math.floor(delta / 7) + 1;
const dia = DIAS[semanaDia];
const arquivo = `content/semanas/semana-${String(semana).padStart(2, "0")}.json`;
const dados = existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, "utf8")) : null;

let titulo, mensagem, link, tags;
if (!dados) {
  titulo = `Semana ${semana} ainda não foi escrita`;
  mensagem = `Peça ao Claude: "gere a semana ${semana} do Aurora". Enquanto isso, que tal reler um texto antigo?`;
  link = appUrl;
  tags = ["hourglass"];
} else if (dia === "sex") {
  titulo = `Sexta: dia de escrever`;
  mensagem = `${dados.sexta.titulo}\nCostura das lições da semana: ${dados.tema}.`;
  link = `${appUrl}#/sexta/${semana}`;
  tags = ["pencil2"];
} else {
  const l = dados.licoes.find((x) => x.dia === dia);
  titulo = `${l.disciplina}: ${l.titulo}`;
  mensagem = `${l.subtitulo} · ${l.minutos} min de leitura`;
  link = `${appUrl}#/licao/${semana}/${dia}`;
  tags = [{ Filosofia: "classical_building", "Neurociência": "brain", Literatura: "books", Espiritualidade: "candle" }[l.disciplina] || "sunrise"];
}

if (ensaio) {
  console.log({ titulo, mensagem, link, tags });
  process.exit(0);
}

const resp = await fetch(servidor, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ topic: topico, title: titulo, message: mensagem, click: appUrl ? link : undefined, tags, priority: 4 }),
});
if (!resp.ok) {
  console.error(`ntfy respondeu ${resp.status}: ${await resp.text()}`);
  process.exit(1);
}
console.log(`Enviado: ${titulo}`);
