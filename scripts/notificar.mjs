// Envia a notificação do dia direto para o app no celular (Web Push).
// Variáveis: VAPID_PRIVATE_KEY e PUSH_SUBSCRIPTION (o código que o app mostra em Diário → Notificações).
// DRY_RUN=1 só mostra o que seria enviado. TESTE=1 envia mesmo antes do início ou no fim de semana.
import { readFileSync, existsSync } from "node:fs";
import webpush from "web-push";

const DIAS = ["seg", "ter", "qua", "qui", "sex"];
const ensaio = process.env.DRY_RUN === "1";
const teste = process.env.TESTE === "1";

const curriculo = JSON.parse(readFileSync("content/curriculo.json", "utf8"));

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

let titulo, corpo, rota;
if (!dados) {
  titulo = `Semana ${semana} ainda não foi escrita`;
  corpo = `Peça ao Claude: "gere a semana ${semana} do Aurora". Enquanto isso, releia um texto antigo.`;
  rota = "#/";
} else if (dia === "sex") {
  titulo = "Sexta: dia de escrever";
  corpo = `${dados.sexta.titulo}\nCosture as lições da semana: ${dados.tema}.`;
  rota = `#/sexta/${semana}`;
} else {
  const l = dados.licoes.find((x) => x.dia === dia);
  titulo = `${l.disciplina}: ${l.titulo}`;
  corpo = `${l.subtitulo} · ${l.minutos} min`;
  rota = `#/licao/${semana}/${dia}`;
}
const mensagem = { titulo, corpo, rota, tag: `aurora-${semana}-${dia}` };

if (ensaio) {
  console.log(mensagem);
  process.exit(0);
}

const { VAPID_PRIVATE_KEY, PUSH_SUBSCRIPTION } = process.env;
if (!VAPID_PRIVATE_KEY || !PUSH_SUBSCRIPTION) {
  console.error("Defina os secrets VAPID_PRIVATE_KEY e PUSH_SUBSCRIPTION.");
  process.exit(1);
}

webpush.setVapidDetails("https://github.com/guinho0/aurora", curriculo.vapid_publica, VAPID_PRIVATE_KEY);
try {
  await webpush.sendNotification(JSON.parse(PUSH_SUBSCRIPTION), JSON.stringify(mensagem), { TTL: 6 * 3600, urgency: "high" });
  console.log(`Enviado: ${titulo}`);
} catch (e) {
  if (e.statusCode === 404 || e.statusCode === 410) {
    console.error("A inscrição expirou: abra o Aurora no celular, ative as notificações de novo e atualize o secret PUSH_SUBSCRIPTION.");
  } else {
    console.error(`Falha no envio (${e.statusCode ?? "?"}): ${e.body || e.message}`);
  }
  process.exit(1);
}
