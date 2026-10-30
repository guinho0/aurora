// Confere se os arquivos de semana seguem o formato que o app espera.
// Uso: node scripts/validar.mjs
import { readdirSync, readFileSync } from "node:fs";

const DIAS = ["seg", "ter", "qua", "qui"];
const DISC = { seg: "Filosofia", ter: "Neurociência", qua: "Literatura", qui: "Espiritualidade" };
let erros = 0;
const falha = (arq, msg) => { erros++; console.error(`✗ ${arq}: ${msg}`); };

for (const arq of readdirSync("content/semanas").filter((f) => f.endsWith(".json")).sort()) {
  let s;
  try { s = JSON.parse(readFileSync(`content/semanas/${arq}`, "utf8")); }
  catch (e) { falha(arq, `JSON inválido (${e.message})`); continue; }

  const esperado = Number(arq.match(/\d+/)[0]);
  if (s.semana !== esperado) falha(arq, `campo "semana" é ${s.semana}, esperado ${esperado}`);
  for (const c of ["modulo", "tema", "introducao", "licoes", "sexta"]) if (!s[c]) falha(arq, `falta "${c}"`);

  DIAS.forEach((d) => {
    const l = s.licoes?.find((x) => x.dia === d);
    if (!l) return falha(arq, `falta a lição de ${d}`);
    if (l.disciplina !== DISC[d]) falha(arq, `${d}: disciplina "${l.disciplina}", esperado "${DISC[d]}"`);
    for (const c of ["titulo", "subtitulo", "minutos", "texto", "trecho", "conceitos", "reflexao", "desafio", "quiz"]) if (!l[c]) falha(arq, `${d}: falta "${c}"`);
    l.quiz?.forEach((q, i) => {
      if (q.opcoes?.length !== 4) falha(arq, `${d}: quiz ${i} precisa de 4 opções`);
      if (!(q.correta >= 0 && q.correta < (q.opcoes?.length ?? 0))) falha(arq, `${d}: quiz ${i} com "correta" inválida`);
    });
    const palavras = (l.texto || []).join(" ").split(/\s+/).length;
    console.log(`  ${arq} ${d} ${String(palavras).padStart(4)} palavras · ${l.titulo}`);
  });
  for (const c of ["titulo", "proposta", "perguntas_guia", "palavras_minimas", "criterios"]) if (!s.sexta?.[c]) falha(arq, `sexta: falta "${c}"`);
}

console.log(erros ? `\n${erros} problema(s).` : "\nTudo certo.");
process.exit(erros ? 1 : 0);
