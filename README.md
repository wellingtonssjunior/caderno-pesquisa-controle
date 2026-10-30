# Caderno de pesquisa em controle preditivo

Aplicação web criada para organizar o estudo e o acompanhamento de uma pesquisa em controle preditivo na UFC: **conteúdo técnico, notas, tarefas, referências e materiais em um mesmo lugar**.

**TypeScript · React · interface web · persistência de dados · documentação técnica**

## O que a aplicação oferece

- Trilha de 14 sessões de estudo com equações renderizadas por KaTeX, exemplos e práticas MATLAB.
- Notas, tarefas e registros com salvamento explícito.
- Guia do Robô Hulk com arquitetura, roteiro de operação e simulador cinemático ideal.
- Organização de arquivos e referências de pesquisa.
- Autenticação e persistência de registros com Cloudflare D1/Drizzle.

Os exemplos são didáticos. O simulador e o guia não comprovam validação em hardware nem resultados experimentais da pesquisa.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `app/` | Páginas, estilos e rotas de API |
| `components/` | Interface do caderno, sessões e guia |
| `lib/` | Conteúdo, acesso a dados e autenticação |
| `db/` e `drizzle/` | Esquema e migrações |
| `build/` e `scripts/` | Integração com runtime e ferramentas locais |

## Tecnologias e origem

React e TypeScript, sobre a base Next.js/Vinext com Vite; Tailwind CSS; KaTeX; Drizzle e Cloudflare D1. O projeto utiliza uma base do Sites e componentes de terceiros, com os avisos de licença preservados. A documentação e organização da pesquisa são de Wellington da Silva Sales Júnior; as fontes técnicas estão indicadas no próprio conteúdo.

## Executar e configurar

Requer Node.js **22.13 ou superior**, npm e ambiente compatível com o runtime Cloudflare utilizado pelo projeto.

```bash
npm ci
npm run dev
```

O servidor local usa `http://127.0.0.1:5173`. Para autenticar e salvar registros, é necessário configurar o binding D1 `DB`, aplicar as migrações de `drizzle/` e criar `.dev.vars` com credenciais próprias, conforme os nomes de `.env.example`. `RESEARCH_PASSWORD_HASH` utiliza o formato `salt:hash` PBKDF2-SHA256 definido em `lib/auth.ts`; não é uma senha em texto simples.

Esta é uma cópia de portfólio do código. Credenciais, banco preenchido, uploads, logs, estado local e vínculo com a implantação pessoal foram excluídos. O procedimento completo de instalação em uma máquina limpa ainda não foi validado para esta cópia.

## Documentação e verificação

- [Notas técnicas do desenvolvimento original](NOTAS-TECNICAS.md)
- `node scripts/check-study.mjs`: verifica conteúdo e renderização das sessões, após instalar as dependências.
- `npm run build`: compilação da aplicação.

As notas técnicas preservam o histórico do ambiente original; caminhos externos, inicializadores e serviços mencionados ali podem não existir nesta cópia. Publicar este código no GitHub não publica o caderno pessoal nem concede acesso aos seus registros.
