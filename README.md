# Instalação

Este projeto é um jogo multiplayer executado em Node.js.

## Pré-requisitos
- [Node.js](https://nodejs.org/) instalado (versão 16 ou superior).

## Passos para instalar e executar
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor:
   ```bash
   npm start
   ```
3. Abra o navegador e acesse [`http://localhost:8080`](http://localhost:8080).

Opcionalmente, defina a porta via variável de ambiente `PORT` antes de iniciar:
```bash
PORT=3000 npm start
```

## Novidades
- Mapa expandido para 160x120 células.
- Sistema de salas automático que agrupa até 50 jogadores por sala. Deixe o campo **Sala** vazio para entrar automaticamente.
- Sistema de níveis que envia mensagens de progresso ao subir de nível.
- Terreno com elementos decorativos como árvores e pedras para um visual mais rico.

## PDF Utilities

Este projeto inclui agora um módulo simples para manipulação de PDFs localizado em `pdf-tools.js`.

### Funções Disponíveis
- **mergePDFs**: une vários arquivos PDF em um único.
- **extractText**: extrai o texto de um arquivo PDF.

### Exemplo de Uso
```javascript
const { mergePDFs, extractText } = require('./pdf-tools');

(async () => {
  await mergePDFs(['a.pdf', 'b.pdf'], 'merged.pdf');
  const text = await extractText('merged.pdf');
  console.log(text);
})();
```
