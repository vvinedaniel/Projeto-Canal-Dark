# Logo oficial

- `logo-original.png`: o arquivo recebido, intacto (fundo azul-marinho).
- `logo.png`: o mesmo emblema com fundo transparente, usado nos vídeos. É gerado por
  `python3 scripts/brand-logo.py <arquivo-recebido.png> public/brand`, que também grava `logo-previa.png`
  (o emblema sobre fundo claro e laranja, para conferir o recorte).

Onde aparece (`src/components/hud/Logo.tsx`):

- **Emblema inteiro** (`<Logo />`): cartelas de abertura e de fecho, com brilho neon ciano desenhado no
  vídeo. O slogan "VOCÊ SEGUE. VOCÊ MORA. VOCÊ DECIDE." já está no emblema; não repita o slogan embaixo.
- **Só o nome** (`<Logo variant="marca" />`): HUD, no canto. O emblema inteiro ficaria ilegível a 60 px.
  O nome usa as cores da logo: SEGUE branco e CITY dourado.
- A **bandeira oficial** da cidade (mastros da praça e da prefeitura) segue a da logo: verde com coroa
  dourada.

Para trocar a logo, rode o script com o arquivo novo; nada no código precisa mudar.
