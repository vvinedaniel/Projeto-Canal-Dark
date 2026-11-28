# Ep. 02 — "OS PRIMEIROS MORADORES CHEGARAM!" · pacote para aprovação

**Nada foi renderizado nem publicado.** Este pacote reúne o roteiro da narração, o storyboard cena a cena e
a ficha visual dos 10 moradores fundadores, para aprovação antes do render.

Base:
- identidade visual V2.0, aprovada;
- estado oficial do Dia 01 (`data/snapshots/dia-01.json`), preservado e sem alterações;
- estado do Dia 02 em rascunho (`data/snapshots/dia-02.rascunho.json`).

## 1. O que já foi preparado no sistema

| Item | Situação |
|---|---|
| 10 moradores cadastrados | Pelo comando oficial (`residents:add`), com nome e profissão **exatamente como comentados** (campo `titulo`) e fonte "comentário no TikTok". Nenhum morador inventado. |
| Ordem de chegada | **Mateus = Morador Nº 1** (1º comentário, confirmado). Os outros 9 estão como "ordem a confirmar" (`ordemConfirmada: false`) e não recebem número na tela. |
| Título e distintivo | Os 10 têm `MORADOR FUNDADOR` (permanente) e `distintivo: fundador-ouro`. O distintivo é uma estrela dourada no peito, no retrato e no sprite da cidade. |
| Profissões novas | Neurocirurgião(ã) (no hospital), Coveiro(a) (no cemitério), Advogado(a) (no escritório de advocacia) e Empresário(a) (no Centro Empresarial). Cada morador guarda a forma que comentou: Neurocirurgiã, Advogada, Empresária, Empresário. |
| Casas | 10 casas individuais, da Casa 12 à 30, na Vila Nova. **Mateus ficou com a Casa 12**, a mesma que o Ep. 01 mostrou como "LIVRE · PODE SER A SUA". |
| Trabalho | Hospital: Mateus e Mari · Delegacia: Davi · Oficina: Gabriel e Juan · Mercadinho: Jorge · Centro Empresarial: Alicia e Muri · Escritório de Advocacia (em projeto): Gabrielly · Cemitério (em projeto): Roberto. |
| Obras novas | **Cemitério** no único gramado livre (canto sudeste, atrás da Casa 24, lote 4×2): muro de pedra, arco "CEMITÉRIO", lápides e cruzes, capela e ciprestes. **Escritório de Advocacia** no Lote 3 (16,21), que já era um lote de escritório planejado: prédio de pedra, "ADVOCACIA" e uma balança na fachada. As duas ficam como **planejadas**; no episódio aparecem como planta holográfica, sem que a cidade seja reconstruída. |
| Contadores separados | **MORADORES** (cadastrados = 10) e **SEGUIDORES** (TikTok) são campos separados, e a HUD mostra os dois. A meta da eleição agora conta seguidores, como diz a fala do Ep. 01 ("cem seguidores"); as outras metas contam moradores. **O número real de seguidores ainda não foi informado**: a prévia mostra "—". |
| Conquista | "Os 10 Moradores Fundadores", registrada no Dia 02. A meta "Fundadores da cidade (10)" está concluída. |
| Cidade habitada (Dia 02) | Calculada a partir dos dados (`src/scenes/ep02/cidade.ts`): ver a lista abaixo. |
| Ep. 01 protegido | O Ep. 01 e as capas dele passaram a ler os números do snapshot do Dia 01 (24 casas, 48 vagas, 13 locais), e não do estado atual. Um re-render do Ep. 01 continua fiel ao vídeo publicado. |

Cidade habitada no Dia 02:
- as 10 casas ocupadas acendem;
- os 5 serviços com funcionário ficam abertos (hospital, delegacia, oficina, mercadinho e Centro
  Empresarial); os outros ficam na penumbra;
- a frota mínima tem viatura, 3 carros e 1 moto. Não há ônibus, táxi nem bombeiros, porque ninguém tem
  essas profissões;
- nas ruas andam **só os 10 fundadores**, sem pedestres genéricos.

## 2. Roteiro completo da narração (para gravar)

São 142 palavras, ~55 s de fala no ritmo do Ep. 01. Com os respiros, a voz termina por volta de 65 s; o
resto é o fecho. Sem acelerar.

> **Dez pessoas decidiram morar na minha cidade.**
> **E uma delas já pediu um cemitério.**
> *(pausa curta)*
> Ontem eram zero moradores.
> Hoje, as primeiras luzes acenderam.
> Mateus, médico, foi o primeiro a comentar: o morador número um.
> Depois chegaram:
> Davi, policial.
> Gabriel e Juan, mecânicos.
> Mari, neurocirurgiã.
> Alicia, empresária, e Muri, empresário.
> Gabrielly, advogada.
> Jorge, comerciante.
> E Roberto… *(pausa)* coveiro.
> *(pausa)*
> Só tem um detalhe: a cidade não tem cemitério.
> Então o primeiro pedido oficial é esse: um cemitério para o Roberto trabalhar.
> E a Gabrielly vai ganhar um escritório de advocacia. As duas obras já estão no mapa.
> Agora tem gente nas ruas, os primeiros carros, e cinco serviços abriram as portas.
> Esses dez são os moradores fundadores, com um distintivo dourado para sempre.
> Mas ainda tem catorze casas vazias.
> Comente seu nome e a profissão que você quer ter.
> O próximo morador pode ser você.

Notas:
- **Gancho:** as duas primeiras frases são exatamente as pedidas.
- **Ordem da lista:** segue a sua mensagem, porque a ordem real ainda não foi confirmada. Ela não aparece
  numerada na tela (só o Mateus é "Nº 1"). Se a ordem for confirmada antes da gravação, é só reordenar
  as linhas.
- **Números conferidos nos dados:** 10 moradores, 24 − 10 = **14 casas vazias**, **5 serviços** com
  funcionário e **2 obras** no mapa.
- **Sem pedido genérico:** o convite final é o mesmo mecanismo do Ep. 01 ("Comente seu nome e a
  profissão").

## 3. Storyboard cena a cena (tempos estimados; serão ajustados à voz gravada, como no Ep. 01)

| # | Tempo (estim.) | Fala | Plano | O que muda na tela | Som |
|---|---|---|---|---|---|
| 1 | 0,0–3,0 | Dez pessoas decidiram morar na minha cidade. | Ilha no fim de tarde, afastando | **1º quadro:** contador MORADORES virando 0 → 10 e 10 retratos entrando em fila no alto; as casas começam a acender. | moedas em cascata, subida |
| 2 | 3,0–6,0 | E uma delas já pediu um cemitério. | Corte para o canto sudeste | Roberto (chapéu) aponta para o gramado vazio; balão "PEDIDO: CEMITÉRIO" com "!" vermelho. | arranhão de disco, notificação |
| 3 | 6,0–10,8 | Ontem eram zero moradores. Hoje, as primeiras luzes acenderam. | Vila Nova | Lembrança do **Dia 01** (filtro e selo "DIA 01 · 0 MORADORES", casas apagadas), troca em ladrilhos para o **Dia 02**: as 10 casas acendem uma a uma. | tique a cada luz |
| 4 | 10,8–15,8 | Mateus, médico, foi o primeiro a comentar: o morador número um. | Casa 12 (close) | Mateus chega à porta e a casa acende; ficha com retrato "**Nº 1 · PRIMEIRO MORADOR** · MÉDICO"; o distintivo dourado brilha; confete dourado. | conquista |
| 5 | 15,8–27,6 | Depois chegaram: Davi… Gabriel e Juan… Mari… Alicia… Muri… Gabrielly… Jorge… | 6 planos de ~1,8 s: delegacia, oficina, hospital, Centro Empresarial, lote da advocacia, mercadinho | A cada nome entra uma carta com retrato, nome e profissão comentada; a pessoa aparece no local (andando ou trabalhando); o contador de fundadores sobe. | um blip por nome, batida |
| 6 | 27,6–30,6 | E Roberto… coveiro. | Close no Roberto | A música corta; carimbo "COVEIRO"; ele ergue a pá. | silêncio + carimbo |
| 7 | 30,6–40,5 | Só tem um detalhe: a cidade não tem cemitério. Então o primeiro pedido oficial é esse… | Visão geral → canto sudeste | Busca no minimapa: "CEMITÉRIO: NÃO ENCONTRADO"; o cursor escolhe o gramado livre; a **planta holográfica** do cemitério sobe; carimbo "PEDIDO OFICIAL Nº 1 · EM PROJETO". | busca, erro, construção |
| 8 | 40,5–46,0 | E a Gabrielly vai ganhar um escritório de advocacia. As duas obras já estão no mapa. | Lote 3 → minimapa | Planta da ADVOCACIA sobe com a Gabrielly na frente; o minimapa marca as 2 obras; "2 OBRAS NO MAPA". | construção, ping |
| 9 | 46,0–51,3 | Agora tem gente nas ruas, os primeiros carros, e cinco serviços abriram as portas. | Ruas à noite | Fundadores andando, viatura e carros (frota mínima); os 5 serviços acendem com "ABERTO" (os outros na penumbra); painel "5 SERVIÇOS ATIVOS". | trânsito leve, 5 ding |
| 10 | 51,3–56,5 | Esses dez são os moradores fundadores, com um distintivo dourado para sempre. | Praça, Monumento da Fundação | Painel FUNDADORES com os 10 retratos (dourado); conquista "OS 10 FUNDADORES". | subida de nível |
| 11 | 56,5–59,2 | Mas ainda tem catorze casas vazias. | Fileiras de casas | Ícones ciano de "VAGA" nas 14 casas apagadas; "14 CASAS LIVRES". | popups |
| 12 | 59,2–65,0 | Comente seu nome e a profissão… O próximo morador pode ser você. | Casa livre | Botões COMENTE / NOME + PROFISSÃO; ficha "**MORADOR Nº 11 · ?**". | notificação, brilho |
| 13 | 65,0–75,0 | — | Ilha à noite, afastando | As 10 janelas acesas na cidade escura, a **logo oficial**, contador MORADORES 10 e "DIA 03 EM BREVE". | acorde final |

Regras mantidas do Ep. 01:
- corte a cada ~3 s, com mínimo de 1,6 s;
- máximo de 2 rótulos ao mesmo tempo;
- legendas palavra a palavra com destaques em amarelo;
- composição 9:16 respeitando a interface do TikTok;
- dados sempre lidos de `data/` e do snapshot.

Cena 3 é a única que mostra o "antes": ela usa o estado oficial do Dia 01, com o selo "DIA 01", para não
misturar os dois dias.

## 4. Ficha visual dos 10 moradores fundadores

Os personagens são originais, em pixel art, sem fotos e com aparência fictícia. Cada um tem uma combinação
própria de pele, cabelo, barba ou óculos e porte, para que os 10 sejam distinguíveis. O uniforme vem da
profissão. A aparência fica gravada em `data/residents.json` e se repete em todos os episódios. **Pode
ser ajustada agora, antes da aprovação.**

| Nº | Nome | Profissão (como comentou) | Uniforme | Aparência (fictícia) | Casa | Trabalho |
|---|---|---|---|---|---|---|
| **1** | **Mateus** | Médico | jaleco branco | pele média, cabelo curto escuro, barba | 12 | Hospital |
| — | Davi | Policial | farda azul + quepe | pele clara, cabelo curto castanho, porte forte | 14 | Delegacia |
| — | Gabriel | Mecânico | macacão azul | pele clara, franja ruiva | 16 | Oficina |
| — | Juan | Mecânico | macacão azul | pele morena, careca, barba, porte forte | 18 | Oficina |
| — | Mari | Neurocirurgiã | pijama cirúrgico azul-petróleo + touca | pele escura, cabelo longo, óculos | 20 | Hospital |
| — | Roberto | Coveiro | camisa cinza + chapéu de aba larga | pele média, cabelo grisalho, barba | 22 | Cemitério (em projeto) |
| — | Alicia | Empresária | terninho ameixa + gravata | pele média, cabelo black | 24 | Centro Empresarial |
| — | Gabrielly | Advogada | terninho azul-marinho + gravata | pele clara, rabo de cavalo loiro | 26 | Advocacia (em projeto) |
| — | Jorge | Comerciante | camisa amarela + avental | pele escura, cabelo cacheado, barba, porte forte | 28 | Mercadinho |
| — | Muri | Empresário | terno ameixa + gravata | pele clara, cabelo cacheado castanho, óculos | 30 | Centro Empresarial |

Arquivos:
- `out/ep02-aprovacao/Fundadores-000.00.png`: folha com os 10;
- `out/ep02-aprovacao/fichas/ficha-m00NN.png`: ficha individual de cada um;
- `previa-*.png`: prévia da cidade no Dia 02 (ilha, Vila Nova, cemitério, advocacia, hospital, oficina);
- `construido-*.png`: como o cemitério e a advocacia vão ficar quando forem construídos.

## 5. Para aprovar ou decidir

1. **Roteiro:** aprovado como está ou com ajustes?
2. **Voz:** quem grava a narração do Ep. 02? O Ep. 01 usou a gravação enviada (Cidade.mp3).
   - Com a voz gravada em mãos, eu monto, alinho e renderizo como no Ep. 01.
   - Uma voz sintética paga (ElevenLabs) só seria usada com a sua autorização expressa.
3. **Número real de seguidores** no TikTok, com a data. Ele aparece no contador SEGUIDORES, separado dos
   moradores, e conta para a meta da eleição. Sem esse número, o contador fica "—".
4. **Ordem dos comentários** dos 9 restantes: se for confirmada, numero todos; se não, só o Mateus aparece
   como Nº 1.
5. **Fichas visuais:** a aparência de algum fundador deve mudar (cabelo, barba, óculos, porte)?
6. **Local das obras:** cemitério no canto sudeste e advocacia no Lote 3 estão aprovados?
