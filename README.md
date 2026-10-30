# Aurora — estudo diário

App de celular (PWA) para estudar 5–10 minutos toda manhã, com notificação às 07:00.

| Dia | Disciplina |
|---|---|
| Segunda | Filosofia |
| Terça | Neurociência |
| Quarta | Literatura |
| Quinta | Espiritualidade |
| Sexta | Você escreve um texto costurando a semana |

Cada lição tem texto, trecho de obra, conceitos-chave, quiz, perguntas para reflexão (com espaço para anotar) e uma prática para o dia.
A trilha tem 7 módulos de 4 semanas e sobe de complexidade até **Dostoiévski** (módulo 5) e **Nietzsche** (módulo 6).

## Estrutura

```
index.html, css/, js/app.js   o app
sw.js, manifest.webmanifest   funcionamento offline e instalação no celular
content/curriculo.json        data de início, módulos e temas das semanas
content/semanas/semana-NN.json o conteúdo de cada semana
scripts/notificar.mjs         envia a notificação do dia (ntfy)
scripts/validar.mjs           confere o formato dos arquivos de semana
.github/workflows/            agenda a notificação (seg–sex, 07:00)
```

Seu progresso, anotações e textos ficam **só no celular** (armazenamento do navegador). Em **Diário → Exportar backup** você salva uma cópia.

## Publicar (uma vez)

1. **GitHub Pages** — crie um repositório público (ex.: `aurora`), envie esta pasta e ative *Settings → Pages → Deploy from a branch → main / (root)*. O app fica em `https://SEU-USUARIO.github.io/aurora/`.
   O repositório público expõe só o conteúdo das lições; seus textos nunca saem do aparelho.
2. **Instalar no celular** — abra o endereço acima:
   - Android (Chrome): menu ⋮ → *Adicionar à tela inicial*.
   - iPhone (Safari): compartilhar → *Adicionar à Tela de Início*.
3. **Notificações** — instale o app **ntfy** (Play Store / App Store), toque em *+* e assine um tópico com nome difícil de adivinhar (ex.: `aurora-` seguido de letras aleatórias).
   No GitHub: *Settings → Secrets and variables → Actions → New repository secret*, nome `NTFY_TOPIC`, valor = o mesmo tópico.
4. **Testar** — *Actions → Notificação diária → Run workflow*. A notificação chega no celular e abre a lição do dia.

Observações:
- O agendamento do GitHub pode atrasar alguns minutos.
- O GitHub pausa agendamentos em repositórios sem nenhum commit por 60 dias. Como novas semanas serão adicionadas, isso não deve acontecer; se acontecer, reative em *Actions*.

## Novas semanas

Peça ao Claude neste projeto: *"gere a semana 5 do Aurora"*. Ele cria `content/semanas/semana-05.json` no mesmo formato. Depois:

```
node scripts/validar.mjs
git add . && git commit -m "Semana 5" && git push
```

O app busca o conteúdo novo sozinho na próxima abertura.

## Mudar a data de início

Edite `"inicio"` em `content/curriculo.json` (precisa ser uma segunda-feira).
