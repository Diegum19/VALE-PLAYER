# Vela Player 1.2.0 — 80 melhorias de interface e usabilidade

Estas alterações são implementadas no código do aplicativo. A lista agrupa ajustes de navegação, acessibilidade e apresentação; não adiciona engines, bibliotecas ou imagens externas.

## Início e navegação
1. “Explorar” virou um botão real.
2. O botão abre a tela adequada para a seção.
3. “Continue descobrindo” direciona ao histórico completo.
4. “Minha lista” direciona aos favoritos.
5. Os atalhos rápidos incluem Histórico.
6. Os atalhos rápidos incluem Busca geral.
7. Os botões de seção exibem estado de hover.
8. Os botões de seção têm foco visível.
9. Os botões de seção têm rótulos acessíveis.
10. Os botões de seção informam o destino em tooltip.
11. As faixas horizontais são nomeadas para leitores de tela.
12. As faixas têm agrupamento e rótulo acessível sem remover o papel de botão dos cartões.
13. A navegação rápida usa áreas de clique mais consistentes.
14. O contador das faixas mostra quantos itens existem no conjunto.
15. O botão Explorar permanece visível sem depender de hover.
16. O foco de teclado ganha contraste e espaçamento.
17. A navegação usa rolagem mais previsível.
18. A barra lateral destaca o separador da seção ativa.
19. Os ícones da barra lateral recebem dimensões consistentes.
20. Os controles da barra lateral têm transições mais suaves.

## Cartões, capas e catálogo
21. Os cartões anunciam nome e tipo do conteúdo para acessibilidade.
22. Os botões de cartão declaram tipo explicitamente.
23. Os títulos dos cartões ficam alinhados em até duas linhas.
24. Os metadados têm altura consistente.
25. O fallback de pôster fica centralizado.
26. A imagem do pôster tem transição suave.
27. O zoom das capas é sutil e limitado ao cartão.
28. A moldura do pôster evita extravasamentos.
29. Os selos ganham melhor contraste.
30. As barras de progresso têm terminação arredondada.
31. A grade mantém os cartões alinhados no topo.
32. A área da grade respeita rolagem contida.
33. Os cartões têm estados de foco identificáveis.
34. O espaçamento dos cartões é ajustado em telas médias.
35. O espaçamento dos cartões é ajustado em telas estreitas.
36. A lista de canais ao vivo mantém proporção horizontal.
37. Trilhos de filmes mantêm proporção de pôster.
38. A animação das capas respeita a preferência de movimento reduzido.
39. O contador do catálogo usa números tabulares.
40. Os filtros e ordenadores têm altura mínima consistente.

## Busca, filtros e estados vazios
41. O campo de busca tem altura e espaçamento consistentes.
42. O foco da busca altera o fundo para facilitar a leitura.
43. O botão de limpar filtros tem altura alinhada aos seletores.
44. Os seletores usam cursor e foco mais claros.
45. O placeholder ganha contraste legível.
46. O estado vazio do histórico tem título e explicação.
47. O estado vazio da lista de favoritos tem título e explicação.
48. O estado vazio oferece um botão para explorar o catálogo.
49. A mensagem de estado ganha entrelinha melhor.
50. O estado vazio tem painel com borda e fundo coerentes.
51. O ícone do estado vazio tem destaque visual.
52. O botão do estado vazio tem área de clique maior.
53. O modal respeita os limites de rolagem.
54. Os campos do modal têm altura consistente.
55. Os rótulos dos modais têm cursor apropriado.

## Destaque, detalhes e episódios
56. A seção de destaque ganha cantos inferiores consistentes.
57. A imagem de fundo do destaque evita repinturas desnecessárias.
58. O kicker do destaque ganha um acento visual.
59. Os metadados do destaque podem quebrar linha.
60. O texto longo do título evita transbordamento.
61. Os botões principais do destaque ganham altura consistente.
62. Os atalhos do início têm estado pressionado.
63. O ícone final dos atalhos reage ao hover.
64. O painel de detalhes ganha cantos consistentes.
65. O botão fechar tem área clicável maior e feedback.
66. A sinopse respeita quebras de linha fornecidas.
67. As ações do detalhe têm altura alinhada.
68. Os seletores de temporada têm altura consistente.
69. A temporada ativa preserva o destaque da marca.
70. As miniaturas dos episódios recebem zoom discreto no foco.

## Player, configurações e responsividade
71. A barra de busca temporal ganha trilho estilizado.
72. O marcador da barra de progresso fica mais fácil de agarrar.
73. Os tempos da reprodução usam números tabulares.
74. O controle de volume combina com a cor de destaque.
75. O seletor de qualidade tem fundo e limites consistentes.
76. O botão de tela cheia recebe feedback de hover.
77. O cartão do próximo episódio tem borda mais clara.
78. A barra de contagem regressiva tem extremidades arredondadas.
79. Os controles se adaptam a janelas estreitas e dispositivos de toque.
80. Animações e rolagem respeitam `prefers-reduced-motion`.
