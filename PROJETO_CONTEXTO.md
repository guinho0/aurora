# Aurora — contexto do projeto (continuidade)

> Documento escrito em 2026-11-24 para que o Claude Code, numa máquina nova e sem histórico, entenda o projeto e saiba onde o Thiago parou.

## Resumo

- **O que é:** Aurora, um app de celular (PWA) de estudo diário e pessoal do Thiago. Ele estuda de 5 a 10 minutos toda manhã antes do trabalho. Os temas são filosofia, neurociência/comportamento, literatura e espiritualidade. A meta dele é "evoluir o espiritual pelo conhecimento" sem precisar ler obras inteiras, porque tem pouco tempo e dificuldade com livros longos.
- **Ritmo fixo:** seg Filosofia, ter Neurociência, qua Literatura, qui Espiritualidade. Na **sexta, o Thiago escreve um texto** que costura a semana.
- **Trilha:** 7 módulos de 4 semanas, com complexidade crescente: 1 Conhece-te a ti mesmo, 2 Como viver?, 3 O bem e o mal, 4 Angústia e liberdade, 5 **Dostoiévski**, 6 **Nietzsche**, 7 O sentido.
- **Status:** **em produção** em https://guinho0.github.io/aurora/. Só o Módulo 1 (semanas 1 a 4) tem conteúdo. **A notificação diária nunca chegou a funcionar**, porque falta o secret `PUSH_SUBSCRIPTION`.
- **Início da jornada:** segunda, 2026-11-02 (campo `inicio` em `content/curriculo.json`).
- **Última atividade:**
  - Último commit em 2026-10-30, e a última conversa foi no mesmo dia.
  - Em 2026-11-24 a jornada está na **semana 4**, a última com conteúdo. **A semana 5 começa em 2026-11-30 e ainda não existe.**

## Stack e arquitetura

- **Front-end:** site estático em HTML, CSS e JS puro, sem framework e sem build. Funciona offline via service worker e pode ser instalado na tela inicial.
- **Conteúdo:** arquivos JSON versionados no repositório. O app busca esses arquivos pelo GitHub Pages.
- **Dados do usuário:** progresso, anotações e textos ficam **só no navegador do celular** (armazenamento local). Não há backend. O backup é feito em *Diário → Exportar/Importar backup*.
- **Notificação:**
  - É Web Push (padrão VAPID) enviado por um GitHub Action agendado, que roda `scripts/notificar.mjs` com a lib `web-push@3.6.7`.
  - O service worker (`sw.js`) recebe o push e exibe a notificação, com o título da lição e um link direto para ela.
- **Feedback da sexta:** o botão "Pedir feedback ao Claude" só monta um prompt para o Thiago colar numa conversa com o Claude. O app **não chama nenhuma API**, por isso não tem custo.

```
index.html, css/app.css, js/app.js   app (SPA com rotas por hash: #/licao/N/dia, #/sexta/N, diário…)
sw.js, manifest.webmanifest          offline + instalação; sw.js também trata o evento push
icons/                               ícones gerados por scripts/gerar-icones.mjs (badge-96.png = ícone monocromático da barra do Android)
content/curriculo.json               "inicio", "vapid_publica" (chave PÚBLICA), dias, módulos e temas das 28 semanas
content/semanas/semana-01..04.json   conteúdo do Módulo 1 (~28 KB cada)
scripts/notificar.mjs                calcula a lição do dia (fuso America/Sao_Paulo) e envia o push
scripts/validar.mjs                  valida o formato dos arquivos de semana
scripts/gerar-icones.mjs             gera os PNGs dos ícones
.github/workflows/notificacao.yml    cron "50 9 * * 1-5" (06:50 BRT) + disparo manual com input "teste"
```

## Como rodar

- **Pré-requisitos:** Node 20 ou mais recente, git e `gh` (GitHub CLI logado como `guinho0`). Para servir localmente, qualquer servidor estático serve. Nas sessões anteriores foi usado o Python.
- **Comandos:**
  - `npm ci`: instala o `web-push`, que só é necessário para o script de notificação.
  - `python -m http.server 8765`: depois, abra http://localhost:8765. O service worker só funciona em localhost ou HTTPS.
  - `node scripts/validar.mjs` (ou `npm run validar`): rode sempre depois de criar ou editar uma semana.
  - `DRY_RUN=1 node scripts/notificar.mjs`: mostra a notificação de hoje sem enviar. Acrescente `TESTE=1` para forçar fora de dia útil ou antes do início.
  - `node --check js/app.js && node --check sw.js`: checagem de sintaxe.
  - `npm run icones`: regera os ícones.
- **Variáveis de ambiente:** só o script de notificação usa, e na prática elas são secrets do GitHub Actions. Não há `.env`.
  - `VAPID_PRIVATE_KEY`: chave privada VAPID. Está **apenas** no secret do repositório (*GitHub → guinho0/aurora → Settings → Secrets and variables → Actions*). O GitHub não deixa ler o valor de volta. A chave pública correspondente fica em `content/curriculo.json` (`vapid_publica`).
  - `PUSH_SUBSCRIPTION`: o JSON de inscrição que o app mostra em *Diário → Notificação das 07:00 → Enviar código de ativação*. **Ainda não foi cadastrado.**
  - `DRY_RUN`, `TESTE`: flags opcionais do script, descritas acima.

## Infra, deploy e serviços externos

- **Repositório:** https://github.com/guinho0/aurora. É **público** e usa a branch `main`. Só o conteúdo das lições fica público.
- **Hospedagem:** GitHub Pages, publicado a partir de `main` / root, em https://guinho0.github.io/aurora/.
- **Deploy:** basta `git push` na `main`. O Pages republica sozinho, e o app pega o conteúdo novo na próxima abertura.
- **Agendamento:** GitHub Actions "Notificação diária" (`notificacao.yml`). Para testar manualmente: `gh workflow run notificacao.yml -R guinho0/aurora -f teste=true`.
- **Push:** o celular é Android (Chrome), e o push passa pelo FCM do Google, que entra automaticamente pelo endpoint da inscrição. Não há conta ou projeto Firebase próprio.
- **Secrets existentes no repositório (em 2026-11-24):** só `VAPID_PRIVATE_KEY`, criado em 2026-10-30. `NTFY_TOPIC` existiu e foi apagado.

## Histórico e decisões importantes

- **2026-10-28/29: concepção.**
  - O Claude propôs alguns formatos: pílula diária, trilhas em Markdown, segundo cérebro e painel web.
  - O Thiago escolheu um **app no celular com notificação diária**, conteúdo de segunda a quinta e texto na sexta. Ele quer "ler, refletir e se desafiar", e isso o prende.
  - Também escolheu um **PWA próprio no GitHub Pages**, em vez de um artifact do claude.ai.
  - O conteúdo das 4 semanas do Módulo 1 foi escrito por agentes em paralelo: 16 lições e 4 propostas de sexta.
  - Cada lição tem texto (cerca de 450 a 650 palavras), trecho da obra, conceitos-chave, quiz de 2 perguntas com 4 opções e uma única tentativa, perguntas de reflexão com campo para anotar, e uma prática do dia.
- **2026-10-30 13:06, commit `985b22c`.**
  - Repositório criado com `gh` e Pages ativado.
  - A primeira versão da notificação usava o **ntfy** (secret `NTFY_TOPIC`).
  - Foi adicionado o modo `TESTE`, porque a jornada só começava em 2/11.
- **2026-10-30 17:24, commit `c8a8377`: troca do ntfy por Web Push.**
  - O Thiago **rejeitou instalar um app da Play Store (ntfy)** e **rejeitou notificação por e-mail**. Ele quer apenas uma notificação no celular Android, vinda do próprio app.
  - O Google Agenda chegou a ser oferecido como alternativa, mas não foi escolhido.
  - As chaves VAPID foram geradas e o ntfy foi removido, junto com o secret dele.
  - O app ganhou o cartão "Notificação das 07:00" no Diário e um lembrete na tela Hoje.
  - Foi criado o ícone monocromático da barra de status, `badge-96.png`.
  - **Correção feita no mesmo commit:** quando o `cache.addAll` do service worker falhava, a instalação inteira do SW falhava junto, e o painel ficava travado em "Verificando…". O cache passou a ser tolerante a falhas.
  - O envio foi testado ponta a ponta com um Chrome no PC: o FCM aceitou. **Nunca foi testado no celular do Thiago.**
- **Pendente do lado do Thiago desde então:** o código de ativação nunca foi enviado. Veja a próxima seção.
- **Ressalva de conteúdo:** os agentes marcaram algumas citações como "tradução livre" e deixaram pontos para conferir:
  - a redação exata de Eclesiastes 9:7 na tradução de Almeida;
  - a data da carta de Simone Weil;
  - a ordem dos rostos no sonho de Pahóm, em Tolstói.

## Onde parei

- **Última conversa (2026-10-30 20:24):**
  - O Claude publicou o Web Push e pediu ao Thiago que, no celular, fizesse três coisas: instalar ou reabrir o app, ir em *Diário → Ativar notificações*, e tocar em *Enviar código de ativação*, colando o código na conversa.
  - **O Thiago não respondeu com o código.** A conversa termina aí.
- **Consequência:**
  - O secret `PUSH_SUBSCRIPTION` **nunca foi cadastrado**.
  - **Todas as execuções do workflow agendado falharam:** 19 runs entre 2026-10-30 e 2026-11-23, todas com o erro "Defina os secrets VAPID_PRIVATE_KEY e PUSH_SUBSCRIPTION."
  - O GitHub provavelmente manda um e-mail de falha a cada dia útil.
- **Conteúdo:** só existem `semana-01` a `semana-04`. Pelo calendário, em 2026-11-24 ele está na semana 4, e **a semana 5 ("O que depende de mim", Módulo 2) começa em 2026-11-30 sem conteúdo**. Os temas das semanas 5 a 28 estão em `content/curriculo.json`.
- **Uso real do app:** é incerto se o Thiago está usando. O progresso fica só no celular dele, e não há nenhum sinal disso no repositório.
- **Mudanças não commitadas:** nenhuma. O `git status` está limpo e a `main` está sincronizada com `origin/main`.
- **Bugs conhecidos:**
  - O workflow falha todos os dias por falta do secret.
  - Os runs agendados estão começando muito atrasados: os últimos foram criados entre 18:00 e 21:44 UTC, e não às 09:50 UTC. Mesmo com a inscrição feita, a notificação "das 07:00" chegaria à tarde ou à noite.

## Próximos passos

1. **Escrever a semana 5** (urgente, porque começa em 2026-11-30) e, de preferência, o resto do Módulo 2 (semanas 6 a 8).
   - Siga o formato exato de `content/semanas/semana-01.json` e os temas e destaques de `curriculo.json`.
   - Rode `node scripts/validar.mjs` e depois faça commit e push.
2. **Ativar a notificação:**
   - Peça ao Thiago o código de ativação. Ele faz *Diário → Ativar notificações → Enviar código de ativação* no app instalado no Android.
   - Quando ele colar `Código de ativação do Aurora: {json}`, tire o prefixo e rode: `gh secret set PUSH_SUBSCRIPTION -R guinho0/aurora` (passando o JSON pela entrada padrão).
   - Em seguida: `gh workflow run notificacao.yml -R guinho0/aurora -f teste=true`.
   - Por fim, confirme com o Thiago que a notificação chegou.
   - **Atenção:** se a chave VAPID tiver sido perdida ou trocada, veja Armadilhas.
3. **Resolver o atraso do cron do GitHub.** Algumas opções:
   - adiantar o horário do cron;
   - usar um agendador externo que chame `workflow_dispatch`;
   - aceitar o atraso.
   Discuta com o Thiago antes de mudar.
4. Conferir as citações marcadas como "para conferir" (Eclesiastes 9:7, a carta de Simone Weil, o sonho de Pahóm).
5. Se o Thiago não quiser mais a notificação, desativar o workflow para parar os e-mails de falha: `gh workflow disable notificacao.yml -R guinho0/aurora`.

## Preferências do Thiago neste projeto

- Escreve em português, de forma curta e direta ("faça isso", "vamos lá?"). Responda em português.
- Prefere receber opções antes de começar algo novo ("me de algumas ideias antes de seguirmos"). Depois que escolhe, quer execução completa: pode publicar, criar o repositório e disparar testes.
- Quer ser **desafiado**, não só ler. Por isso os quizzes, as perguntas de reflexão e o feedback "honesto e desafiador, sem elogio vazio" no texto de sexta.
- Quer **só notificação no celular Android**: sem app extra, sem e-mail e sem ntfy. Não proponha isso de novo.
- O conteúdo deve condensar as obras, porque ele não tem tempo para ler livros inteiros. A complexidade deve subir gradualmente até Dostoiévski e Nietzsche.
- **Rigor com citações:** marque "(paráfrase)" ou "tradução livre", mantenha curtas as citações de obras que não estão em domínio público, e não invente referência. Quando houver dúvida, declare.
- Pedido padrão para gerar conteúdo: *"gere a semana N do Aurora"*.

## Armadilhas

- **A chave privada VAPID só existe no secret do GitHub.** Ela foi gerada numa pasta temporária, e não há cópia local. Se for preciso trocá-la:
  - gere um novo par com `npx web-push generate-vapid-keys`;
  - atualize `vapid_publica` em `content/curriculo.json` e o secret `VAPID_PRIVATE_KEY`;
  - faça o push;
  - peça ao Thiago para **reativar as notificações no celular**, porque a inscrição antiga fica inválida com outra chave pública, e cadastre o novo `PUSH_SUBSCRIPTION`.
- **A inscrição push se perde** se o Thiago reinstalar o app ou limpar os dados do Chrome. Nesse caso o script falha com 404 ou 410 e uma mensagem explicativa. A solução é reativar no app e atualizar o secret.
- **Agendamentos do GitHub:**
  - podem atrasar muito, como já foi observado (horas);
  - são **pausados depois de 60 dias sem commit** no repositório. Se isso acontecer, reative em *Actions*.
- **O `inicio` em `curriculo.json` precisa ser uma segunda-feira.** A semana do dia é calculada a partir dele, no fuso America/Sao_Paulo. Se o arquivo da semana atual não existir, a notificação manda "gere a semana N do Aurora".
- **Service worker:** mudanças no app podem ficar presas no cache. Confira a versão do cache em `sw.js` ao alterar arquivos, e peça para fechar e reabrir o app.
- O repositório é **público**: nunca commite a chave privada nem o JSON de inscrição. Dados pessoais do Thiago não vão para o repositório, porque ficam só no aparelho dele.
- O `README.md` ainda menciona "(ntfy)" na linha do `scripts/notificar.mjs`, o que está desatualizado. Hoje o envio é por Web Push.
- Não mate todos os processos Python ao encerrar um servidor local de teste. Isso já aconteceu e foi corrigido: encerre só o processo que você iniciou.
