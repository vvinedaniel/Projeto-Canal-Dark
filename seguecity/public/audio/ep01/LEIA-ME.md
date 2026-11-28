# Narração do Ep. 01

Coloque aqui a voz final como `narracao.wav` (ou `narracao.mp3`), em português brasileiro, começando
no 0 s do episódio e terminando antes de 75 s. Depois rode:

```bash
npm run narration:fit   # mede as frases no áudio e grava src/scenes/ep01/narration-timing.json
npm run render:ep01     # renderiza de novo com a voz; a trilha abaixa sozinha sob a fala
```

Sem este arquivo o episódio é renderizado só com trilha, efeitos e legendas (marcações provisórias).
