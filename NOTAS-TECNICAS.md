# Caderno de pesquisa — Controle Preditivo

## Robô Hulk · guia do projeto

A seção **Robô Hulk · projeto** reúne oito etapas de aprendizado, arquitetura clicável, simulador cinemático ideal, trechos de código, roteiro manual de operação, histórico e três TCCs da UFC que mencionam a plataforma. O botão **Baixar compilado** exporta o conteúdo, as fontes e as notas em Markdown.

Conteúdo em `lib/hulk-content.ts`, interface em `components/hulk-guide.tsx` e estilos em `app/hulk.css`. Notas e progresso usam o registro `hulk-progress` e o fluxo existente de **Salvar**, sem migração de banco. Fonte: cópia local de `../ros2_robot_controller/ros2_robot_controller`, HEAD `acca3dc`, arquivos modificados e patches adjacentes, examinados em 13/10/2026. Não representa sincronização automática com GitHub nem comprovação de ensaios no hardware. Divergências de parâmetros e calibração estão documentadas na etapa 7.

O caderno pode ser usado localmente ou acessado pela internet durante uma sessão iniciada manualmente, conforme as instruções abaixo.

Interface privada de acompanhamento da iniciação científica. Fonte do plano: `../Plano_de_atividades (1).pdf`. A divisão formal entre bolsistas não orienta este caderno: a condução é autônoma.

## Conteúdo e edição
- `lib/content.ts`: revisão inicial de 14 dias, referências, equações e script didático MATLAB.
- `app/page.tsx`: páginas de acompanhamento, notas, tarefas e ficha da planta.
- `app/api/entries/route.ts`: carregamento e gravação de registros.
- `db/schema.ts` e `drizzle/`: armazenamento persistente D1.

A edição é explícita: use **Salvar** no topo. Alterações ficam na tela em caso de falha; a página avisa antes de sair com alterações pendentes. O conteúdo inicial só é uma proposta de estudo, e nenhuma tarefa começa marcada como concluída.

Uma versão hospedada no Sites mantém sua própria política de acesso. Esta cópia usa o login do caderno para proteger leituras e escritas. O acesso externo manual acrescenta uma entrada autenticada antes do servidor local. Os registros são de um caderno compartilhado, não de um serviço multiusuário.

## Pesquisa
Os exemplos numéricos não são modelos da planta real. O script MATLAB requer Control System Toolbox e deve ser executado pelo pesquisador; não foi executado durante a criação da interface. As referências CTMS e Feedback Systems são externas; algumas páginas bloquearam extração automatizada.

## Validação
Compilar com o fluxo Sites. Antes de publicar alterações de esquema, gerar e inspecionar migrações Drizzle. Não reescrever migrações já publicadas.

## Uso local e uploads

Abra `../Iniciar caderno.cmd` e acesse **http://127.0.0.1:5173**. Mantenha a janela aberta durante o uso. `npm start` também inicia a versão otimizada. `npm run dev` é reservado ao desenvolvimento, sem execução simultânea na mesma porta. O servidor usa loopback e não fica disponível na rede doméstica. O login existente é preservado. As credenciais e o banco locais continuam nos arquivos de configuração e no estado local já existentes.

A seção **Upload de arquivos** contém fotos experimentais, referências do professor e arquivos MATLAB. Permite arrastar arquivos, selecionar vários, informar assunto e descrição, visualizar imagens compatíveis e baixar os materiais. Cada arquivo tem limite de 50 MB. HEIC/TIFF são armazenados e baixados; a visualização no site cobre JPG, PNG, WEBP, GIF e AVIF.

O middleware local `build/local-uploads.mjs` salva arquivos em `../Uploads`, fora dos diretórios públicos do site. Exige sessão válida, origem local e formatos da categoria; não executa código. Nomes repetidos recebem sufixos. Metadados ficam em `.metadata` na respectiva categoria. Os arquivos e metadados persistem ao reiniciar o servidor. Faça backup de `Uploads` por inteiro. `scripts/serve-caderno.mjs` combina esse middleware com a aplicação compilada executada localmente pelo Miniflare, usando o mesmo identificador D1 e a mesma pasta `.wrangler/state/v3/d1`.

Não foi feita publicação desta mudança. Uma eventual versão publicada anteriormente é independente desta cópia local. Como o projeto está no OneDrive, a sincronização existente também se aplica à pasta de uploads.

## Acesso pela internet, ligado manualmente

1. Abra `../Iniciar caderno publico.cmd` com dois cliques. Aguarde a mensagem **ENDEREÇO PÚBLICO**.
2. Copie o endereço HTTPS da janela ou de `../Endereco publico.txt`. Abra-o no celular ou em outro computador e use o usuário e a senha habituais do caderno.
3. Para desligar, abra `../Encerrar caderno publico.cmd` ou pressione **Ctrl+C** na janela de inicialização.

Nada é instalado na inicialização do Windows: não há serviço nem tarefa agendada. O computador precisa permanecer ligado, sem suspensão e conectado à internet. Os dados e arquivos continuam neste computador. O endereço muda ao abrir uma nova sessão e o provedor gratuito pode alterá-lo ou interromper a sessão; se a conexão cair, encerre e abra novamente. Esta solução é para acesso pessoal ocasional e não oferece disponibilidade garantida.

O provedor padrão é **localhost.run**, autorizado pelo usuário e testado nesta rede. Documentação: https://localhost.run/docs/ e https://localhost.run/docs/forever-free/ . O acesso usa o OpenSSH do Windows, sem enviar chaves pessoais. A chave do servidor é registrada em `.sites-runtime/public/known_hosts`. O Cloudflare foi baixado da distribuição oficial e permanece como opção `node scripts/public-access.mjs --cloudflare`; nesta rede suas conexões à porta 7844 falharam no teste.

O inicializador usa o servidor otimizado existente em `127.0.0.1:5173`, quando disponível, ou inicia uma instância. Se houver um servidor de desenvolvimento antigo nessa porta, encerre-o antes. O gateway em `127.0.0.1:5180` protege a página, os módulos e as APIs com a sessão existente, verifica a origem antes de encaminhar gravações e define cookies externos como Secure. Os uploads usam o middleware local existente. Há um limite compartilhado de cinco tentativas de login externo por quinze minutos. O botão de encerramento fecha o túnel e o servidor iniciado por ele; um servidor local que já estava aberto permanece aberto.

### Correção do carregamento (13/10/2026)

O túnel registrou limitação de transferência com atrasos de vários minutos ao servir os módulos de desenvolvimento. Os iniciadores agora usam arquivos compilados, compressão gzip e cache privado dos arquivos estáticos com nomes versionados. A compilação é refeita automaticamente quando os arquivos da aplicação mudam; as credenciais não entram no cálculo nem nos arquivos de cliente. A validação usa `/api/session`, sem carregar todos os registros, e agrupa verificações simultâneas da mesma sessão sem guardar permissões em cache. A busca dos registros na interface tem limite de vinte segundos, mensagem recuperável e redirecionamento para entrar novamente quando a sessão expira. A velocidade final ainda depende da conexão e do provedor do túnel.

Diagnóstico em `.sites-runtime/public/server.log` e `tunnel.log`. Os testes `scripts/check-public-gateway.mjs` e `scripts/check-public-integration.mjs` verificam a proteção e a integração real. O teste de integração exige o caderno local ligado, cria uma sessão temporária de dois minutos e a remove ao terminar; não altera os registros de pesquisa. `scripts/check-uploads.mjs` usa arquivos temporários separados.

## Caderno guiado de estudos

As 14 sessões existentes foram adaptadas para notebook em português, sem ampliar a trilha. `lib/study-notebooks.ts` contém explicações próprias, equações, exemplos resolvidos, práticas e indicações de leitura; `components/study-session.tsx` apresenta o conteúdo. As fontes originais de `lib/content.ts` continuam acessíveis em cada sessão e na biblioteca.

As equações usam KaTeX instalado no projeto, incluindo fontes locais. Os campos `prediction` e `results` são salvos junto dos registros `day-N`; `notes` e `done` mantêm os mesmos identificadores anteriores. Use **Salvar** no topo. Os scripts podem ser copiados ou baixados para execução no MATLAB; não há execução MATLAB no navegador.

Verificação: `node scripts/check-study.mjs` confere a cobertura das 14 sessões, a renderização das 25 equações, os links originais e a preservação dos campos anteriores. As 11 práticas com código foram executadas com sucesso no MATLAB R2019a instalado, com Control System Toolbox. Os resultados de verificação ficam isolados em `.sites-runtime/study-check`. Exemplos e valores são didáticos e não representam medições da planta.

Os títulos dos capítulos foram conferidos no índice oficial da segunda edição do Feedback Systems: https://fbswiki.org/wiki/index.php/Feedback_Systems:_An_Introduction_for_Scientists_and_Engineers . Algumas páginas CTMS e PDFs bloquearam consulta automatizada; os links originais foram preservados e o texto do caderno é uma explicação própria, não uma tradução desses materiais.
