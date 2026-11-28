# Storyboard final — Ep. 01 "A Fundação" (75 s, 2.250 quadros)

**Título:** Construí uma cidade inteira, mas ninguém mora nela.

Narração oficial: `Cidade.mp3`, 62 s de voz e 16 frases, sem acelerar e sem cortar dentro da fala.
- As frases foram recortadas nas pausas da gravação e ganharam 6,75 s de respiro nas viradas do roteiro.
- A voz vai de 0,15 s a 68,57 s; o resto é amanhecer + logo.
- Tempos de cada palavra em `src/scenes/ep01/words.json`.

Folha visual: `out/entrega-ep01/storyboard.png` (1 quadro por plano) e `folha-1s.jpg` (1 quadro por segundo).

| # | Tempo | Narração | Plano | O que muda na tela | Som |
|---|---|---|---|---|---|
| 1 | 0,00–3,45 | Eu construí uma cidade inteira do zero. | Ilha, plano geral, afastando | **1º quadro:** contador MORADORES 0 + os primeiros prédios já subindo. Prédios brotam do chão em onda com poeira; em 2,9 s a cidade "liga" (postes, vitrines, prédios públicos). | carimbo, 5 golpes de obra, subida de nível |
| 2 | 3,45–6,80 | Mas existe um pequeno problema… | Rua da Vila Nova (casas) | Cursor clica numa casa: "CASA VAZIA". Em "problema": falha na tela, alerta "CIDADE VAZIA", contador pulsa. | clique, som de vazio |
| 3 | 6,80–9,30 | Ninguém mora nela. | Bairro residencial, alto | A música desliga (tape stop); ícone vermelho de "vazio" em cada casa (24); contador MORADORES 0 / 24 CASAS VAZIAS piscando. | tique, vento noturno sobe |
| 4 | 9,30–12,25 | Tem casas, escola, hospital, comércio… | Visão geral da cidade + minimapa | Cada lugar falado ganha contorno + rótulo (CASAS, ESCOLA, HOSPITAL, COMÉRCIO), no ritmo da fala. | um toque por lugar |
| 5 | 12,25–14,65 | …e até uma prefeitura. | Prefeitura | Contorno + rótulo PREFEITURA; bandeira oficial. | toque |
| 6 | 14,65–16,50 | Está tudo pronto, | **Interior: casa** | Sala em corte (sofá, TV, mesa), vazia; carimbo PRONTO; rótulo "CASA PRONTA · 0 MORADORES". | carimbo |
| 7 | 16,50–18,85 | esperando pelos primeiros habitantes. | **Interior: hospital** | Leitos vazios, monitores ligados; rótulo "LEITOS VAZIOS · ESPERANDO HABITANTES". | sininhos, subida |
| 8 | 18,85–21,20 | E é aqui que você entra. | Praça (chafariz, monumento) | Em "você": holograma ciano "VOCÊ? · SEU LUGAR NA CIDADE" acena; brilhos. | batida entra, prato |
| 9 | 21,20–24,30 | A partir de hoje, cada novo seguidor… | Praça | Botão SEGUIR; o cursor clica em "seguidor" e o holograma vira pessoa: "NOVO CIDADÃO · EXEMPLO". Selo DEMONSTRAÇÃO. | clique, brilho |
| 10 | 24,30–26,80 | …poderá se tornar um cidadão da SegueCity. | Casa 14 (Vila Nova) | A personagem de exemplo chega em casa; em "cidadão" a casa acende: "+1 CIDADÃO · EXEMPLO", "CASA 14 · OCUPADA · EXEMPLO". | moeda, desbloqueio |
| 11 | 26,80–31,15 | Você poderá escolher seu nome, sua profissão e acompanhar seu personagem… | Close na rua | Comentário de EXEMPLO sendo digitado ("Ana — médica"); em "acompanhar" o cursor seleciona a personagem, que acena, e entra a ficha com retrato (EXEMPLO · personagem fictício). | notificação, digitação |
| 12 | 31,15–33,50 | …vivendo dentro dessa cidade. | **Interior: casa da Ana** | Ana anda até a sala, TV ligada; rótulo "ANA EM CASA · EXEMPLO". | — |
| 13 | 33,50–38,45 | Quer ser médico, policial, empresário, mecânico ou professor? | Centro da cidade, ao fundo | Menu "ESCOLHA SUA PROFISSÃO": uma carta com retrato entra a cada profissão falada (5); a da vez cresce e acende. Etiqueta EXEMPLOS. | um acento musical por profissão |
| 14 | 38,45–42,45 | Nossa cidade precisa de pessoas de todas as profissões. | Visão geral + minimapa | Ícones de vaga em todos os 13 locais de trabalho; painel **48 VAGAS DE EMPREGO · EM 13 LOCAIS** (dados de `jobs.json`). | moeda, popup |
| 15 | 42,45–44,95 | Conforme nossa população crescer, | Bairros (SIMULAÇÃO) | Selo "SIMULAÇÃO · COMO A CIDADE PODE CRESCER"; casas acendem, carros e pedestres aparecem; barra de crescimento. | prato, batida cheia |
| 16 | 44,95–47,60 | novos bairros serão construídos, empresas serão abertas | Lotes "EM BREVE" | 3 prédios novos brotam do chão (NOVO BAIRRO) e uma loja abre (NOVA EMPRESA), com poeira. | obra ×4 |
| 17 | 47,60–51,30 | e acontecimentos poderão mudar o destino da cidade. | Visão geral | Evento de exemplo: tempestade (chuva, neblina, relâmpago); "EVENTO: TEMPESTADE". | trovões, chuva |
| 18 | 51,30–56,90 | Quando chegarmos aos cem seguidores, vamos liberar nossa primeira eleição. | Prefeitura | Painel METAS DA CIDADE (dados de `city-state.json`); em "cem" acende "Eleição para prefeito 0/100"; em "eleição", holofotes + "ELEIÇÃO · LIBERA COM 100 SEGUIDORES". | hino, carimbo |
| 19 | 56,90–59,15 | E vocês poderão escolher… | **Interior: gabinete da prefeitura** | Cadeira vazia; "PREFEITO(A): ? · CARGO VAGO · VOCÊS ESCOLHEM". | popup |
| 20 | 59,15–61,20 | …quem vai governar a SegueCity. | Fachada da prefeitura | Holofotes, "QUEM VAI GOVERNAR?". | — |
| 21 | 61,20–63,55 | Hoje começa nossa história. | Ilha, subindo | O céu começa a clarear; carimbo DIA 01 · COMEÇA A NOSSA HISTÓRIA. | carimbo, final cresce |
| 22 | 63,55–66,05 | Comente seu nome e sua profissão. | Vila Nova ao amanhecer | Botões COMENTE e NOME + PROFISSÃO; ícones de vaga (ciano) em cada casa. | notificação |
| 23 | 66,05–69,00 | Quem será o primeiro morador da SegueCity? | Casa 12 | Ficha "MORADOR Nº 1 · SEU NOME · SUA PROFISSÃO" com "?"; "CASA 12 · LIVRE · PODE SER A SUA"; brilho. | brilho, desbloqueio |
| 24 | 69,00–75,00 | — | Ilha ao amanhecer, afastando | A HUD sai; **logo oficial** com brilho neon (69,5 s); "A CIDADE ESTÁ PRONTA. FALTA VOCÊ." (70,6 s); "DIA 02 EM BREVE" (72,3 s). | acorde final (Fmaj9) + sinos do nascer do sol |

## Regras seguidas

- **Ritmo:** um corte a cada 3,1 s em média (24 planos; o mais curto tem 1,75 s). Dentro dos planos longos
  há um estímulo novo a cada 1–2 s (rótulo, carta, botão, ícones, prédio subindo).
- **Variedade:** ilha inteira (planos 1, 21 e 24), bairros (3, 15 e 22), ruas e closes (2, 10 e 11),
  personagens (8–12 e 23), interiores (6, 7, 12 e 19) e menus de jogo (13, 14 e 18).
- **Honestidade:**
  - a HUD e o contador mostram o estado gravado (0 moradores, 48 vagas);
  - a personagem Ana tem o rótulo EXEMPLO em todos os planos em que aparece;
  - o crescimento e a tempestade têm o selo SIMULAÇÃO;
  - o comentário é marcado como EXEMPLO;
  - a casa da Ana volta a ficar apagada depois da demonstração.
- **Composição 9:16:**
  - HUD entre 150 e 350 px;
  - painéis entre 380 e 1.000 px;
  - legendas entre 64% e 77%;
  - selo de demonstração em 1.520 px;
  - nada importante nos 14% de baixo nem nos 12% da direita.
