export type NotebookFormula = { label:string; tex:string; meaning:string };
export type StudyNotebook = {
  concepts:{ title:string; text:string }[];
  formulas:NotebookFormula[];
  example:{ title:string; steps:string[]; conclusion:string };
  code?:string;
  expected:string[];
  experiment:string;
  answer:string;
  reading:{ ref:string; section:string; url?:string }[];
};
const math = String.raw;
const fbs = (chapter:string, section:string) => ({ ref:'fbs', section, url:`https://fbswiki.org/wiki/index.php/${chapter}` });

// Explanations, examples and scripts authored for this notebook; not a translation
// of the linked books. Numerical parameters belong to the existing didactic plan.
export const studyNotebooks:Record<number,StudyNotebook> = {
  1:{
    concepts:[
      {title:'Comece pela pergunta: o que quero manter ou acompanhar?',text:'A referência r é o valor desejado; a saída y é a grandeza física que queremos controlar. O sensor produz a medição yₘ. O controlador compara referência e medição e calcula u, a ação aplicada ao processo. Essas grandezas precisam estar em escalas compatíveis no comparador: não se subtrai temperatura em graus de uma tensão sem conversão.'},
      {title:'Fechar a malha é usar o resultado para corrigir a ação',text:'Em malha aberta, a ação é escolhida sem observar a saída. Em malha fechada, um desvio provoca uma correção. O sinal negativo significa que a medição é subtraída da referência; ele não garante estabilidade. Ganho excessivo, atrasos ou um sinal físico invertido podem transformar a correção em oscilação crescente.'},
      {title:'Perturbação e ruído entram em lugares diferentes',text:'Uma janela aberta altera a troca de calor da sala: é uma perturbação física. Um sensor que oscila sem mudança real da temperatura introduz ruído de medição. O controlador pode reagir aos dois, mas o efeito sobre a saída depende de onde cada sinal entra. Nesta primeira dedução, calculamos apenas a resposta à referência, com os demais sinais nulos.'},
    ],
    formulas:[
      {label:'Os sinais da malha',tex:math`E=R-HY,\qquad U=CE,\qquad Y=GU`,meaning:'Letras maiúsculas representam transformadas de Laplace. C é o controlador, G é o processo e H é o sensor/modelo de medição; os argumentos s foram omitidos.'},
      {label:'Referência até a saída',tex:math`Y=GC(R-HY)\quad\Longrightarrow\quad \frac{Y}{R}=\frac{CG}{1+CGH}`,meaning:'Modelo linear, realimentação negativa, condições iniciais nulas e perturbações nulas. Para medição unitária, H=1.'},
    ],
    example:{title:'Uma sala aquecida',steps:['Defina r=24 °C e suponha que o sensor meça yₘ=22 °C. O erro é +2 °C.','Com ganho proporcional de 100 W/°C, a ação calculada é 200 W. Aqui o ganho converte erro de temperatura em potência.','Ao abrir a janela, a temperatura tende a cair. O erro aumenta e o controlador pede mais potência. Um atuador limitado pode não conseguir fornecê-la.','Se o sensor indicar falsamente uma temperatura 1 °C maior, o controlador reduz a potência mesmo sem uma mudança inicial da temperatura real.'],conclusion:'O diagrama deve mostrar processo, sensor e atuador, além do ponto de entrada de cada perturbação. A equação linear não inclui automaticamente limites de potência.'},
    code:math`% Cálculo algébrico; não simula a dinâmica térmica.
r = 24; ym = 22; Kp = 100; % graus Celsius; W/grau Celsius
e = r - ym;
u = Kp * e;
fprintf('Erro = %.1f graus; potencia pedida = %.1f W\n', e, u);
% Experimente um erro de medição de +1 grau.
u_com_erro_sensor = Kp * (r - (ym + 1))`,
    expected:['O erro inicial é 2 °C e a potência pedida é 200 W.','Com erro positivo de 1 °C no sensor, a potência pedida cai para 100 W.'],
    experiment:'Desenhe a malha da sala. Depois coloque uma perturbação no processo e um ruído na medição. Explique o que cada um muda.',
    answer:'A realimentação usa a saída medida para corrigir desvios, mas também devolve ruído e dinâmica à malha. Uma correção atrasada ou forte demais pode aumentar as oscilações. Estabilidade depende da malha inteira.',
    reading:[fbs('Introduction','Cap. 1: conceito de realimentação e propriedades da realimentação.'),fbs('Transfer_Functions','Cap. 9: diagramas de blocos e funções de transferência.')],
  },
  2:{
    concepts:[
      {title:'A equação guarda o balanço do processo',text:'No modelo 10 dy/dt + y = 2u, a derivada representa a velocidade de mudança da saída. Se a saída parar de variar, resta y=2u. Portanto, o ganho estático é 2. O coeficiente de 10 s determina a escala de tempo; ele não é o atraso puro do processo.'},
      {title:'A função de transferência isola a relação entrada–saída',text:'Ao transformar uma derivada, aparece sY(s)−y(0). Para definir G=Y/U, tomamos condições iniciais nulas. Se y(0) não for zero, há uma resposta adicional associada à condição inicial. G continua útil, mas multiplicar G por U não representa sozinho a resposta completa.'},
      {title:'O modelo pode descrever desvios de um ponto de operação',text:'Em uma linearização, u e y frequentemente representam variações em torno de valores de equilíbrio. Um degrau unitário significa uma variação de uma unidade da entrada escolhida. Neste exemplo, as unidades físicas não foram especificadas: escreva unidade de entrada e unidade de saída em seus gráficos, sem atribuí-las à planta real.'},
    ],
    formulas:[
      {label:'Transformada e função de transferência',tex:math`10[sY(s)-y(0)]+Y(s)=2U(s)\quad\overset{y(0)=0}{\Longrightarrow}\quad G(s)=\frac{2}{10s+1}`,meaning:'A transformada assume um modelo linear e invariante no tempo. O ganho tem unidades de saída/entrada.'},
      {label:'Parâmetros e degrau unitário',tex:math`K=2,\quad \tau=10\,\mathrm{s},\quad p=-\frac1\tau=-0{,}1\,\mathrm{s}^{-1},\qquad y(t)=2(1-e^{-t/10}),\ t\ge0`,meaning:'Com repouso inicial e entrada unitária constante, a saída vai de 0 a 2. Em uma constante de tempo, atinge aproximadamente 63,2% do valor final.'},
    ],
    example:{title:'Da equação até um número verificável',steps:['Aplique Laplace com y(0)=0 e coloque Y em evidência: (10s+1)Y=2U.','Divida por U e pelo denominador: G=2/(10s+1). O polo é a raiz de 10s+1=0.','Para entrada degrau unitário, U=1/s. A decomposição é Y=2/s−2/(s+0,1).','Voltando ao tempo, y=2(1−e^(−t/10)). Em t=10 s, y≈1,264; no regime, y→2.'],conclusion:'Dobrar o ganho dobra a amplitude da resposta. Dobrar a constante de tempo alonga a evolução temporal e mantém o valor final.'},
    code:math`% Requer Control System Toolbox. Exemplo didático.
clear; close all; clc;
s = tf('s'); G = 2/(10*s+1);
t = (0:0.1:60)';
y = step(G,t); y_exata = 2*(1-exp(-t/10));
plot(t,y,t,y_exata,'--'); grid on;
xlabel('Tempo (s)'); ylabel('Saida (unidade de saida)');
legend('Modelo de transferencia','Expressao analitica');
disp(pole(G)); disp(dcgain(G));
fprintf('Maior diferenca: %.3g\n',max(abs(y-y_exata)));`,
    expected:['O polo é −0,1 s⁻¹ e o ganho estático é 2.','As curvas numérica e analítica devem coincidir dentro da precisão numérica.'],
    experiment:'Troque separadamente o numerador de 2 para 4 e a constante de tempo de 10 para 20. Preveja o efeito antes de gerar os gráficos.',
    answer:'K altera a escala da saída; τ altera a velocidade. O polo −1/τ aproxima-se da origem quando τ aumenta, produzindo uma resposta mais lenta.',
    reading:[fbs('Transfer_Functions','Cap. 9: obtenção da função de transferência e transformadas de Laplace.'),{ref:'analysis',section:'First-Order Systems: ganho estático, constante de tempo e resposta ao degrau.'}],
  },
  3:{
    concepts:[
      {title:'Estável não significa rápido nem sem oscilação',text:'Um polo real negativo gera uma exponencial decrescente. Um par de polos complexos com parte real negativa gera oscilações com envoltória decrescente. A parte real governa o decaimento; a parte imaginária governa a frequência amortecida. A amplitude final também depende do numerador.'},
      {title:'Reconheça a forma padrão de segunda ordem',text:'Compare o denominador com s²+2ζωₙs+ωₙ². ωₙ é a frequência natural e ζ é o amortecimento. As fórmulas usuais de sobressinal e tempo de pico abaixo valem para a forma padrão sem zeros, com ganho estático unitário e 0<ζ<1. Zeros e polos adicionais podem mudar a resposta.'},
      {title:'Declare a definição de cada métrica',text:'Tempo de subida: aqui, passagem de 10% a 90% do valor final. Acomodação a 2%: instante após o qual a resposta permanece na faixa de ±2% da variação final. Sobressinal: excesso do pico em relação à variação final. A aproximação 4/(ζωₙ) serve para estimativa, não como identidade exata.'},
    ],
    formulas:[
      {label:'Identificação dos polos',tex:math`G_2(s)=\frac4{s^2+1{,}2s+4},\quad \omega_n=2,\quad \zeta=0{,}3,\quad p=-0{,}6\pm j\,1{,}9079`,meaning:'ωₙ e a parte imaginária dos polos estão em rad/s; a taxa de decaimento é 0,6 s⁻¹.'},
      {label:'Estimativas para a forma padrão subamortecida',tex:math`M_p=100e^{-\pi\zeta/\sqrt{1-\zeta^2}}\approx37{,}23\%,\quad t_p=\frac\pi{\omega_n\sqrt{1-\zeta^2}}\approx1{,}647\,\mathrm{s},\quad t_{\mathrm{acom},2\%}\approx\frac4{\zeta\omega_n}=6{,}67\,\mathrm{s}`,meaning:'O tempo de acomodação medido será diferente da estimativa; calcule-o a partir da resposta e registre a tolerância.'},
    ],
    example:{title:'Comparar duas dinâmicas sem confundir os ganhos',steps:['Para G₁=2/(10s+1), o ganho final é 2, não há sobressinal e o tempo exato de acomodação a 2% é −10 ln(0,02)≈39,12 s.','Para G₂, compare os coeficientes: ωₙ²=4 e 2ζωₙ=1,2. Isso fornece ωₙ=2 e ζ=0,3.','Calcule o pico: como o valor final é 1, a saída máxima prevista é aproximadamente 1,3723.','Use eixos e tempos explícitos. G₁ termina em 2 e G₂ em 1; uma saída maior não significa, por si só, resposta mais rápida.'],conclusion:'Polos descrevem a dinâmica; o valor final exige examinar também o ganho. Use métricas normalizadas pela variação final para comparar formas de resposta.'},
    code:math`clear; close all; clc;
s = tf('s'); G1 = 2/(10*s+1); G2 = 4/(s^2+1.2*s+4);
t = (0:0.01:60)';
y1 = step(G1,t); y2 = step(G2,t);
subplot(2,1,1); plot(t,y1); grid on; ylabel('Saida G1');
subplot(2,1,2); plot(t,y2); grid on; ylabel('Saida G2'); xlabel('Tempo (s)');
M1 = stepinfo(y1,t,dcgain(G1),'SettlingTimeThreshold',0.02);
M2 = stepinfo(y2,t,dcgain(G2),'SettlingTimeThreshold',0.02);
disp(M1); disp(M2); disp(pole(G2));`,
    expected:['G₁ aproxima-se de 2 de forma monótona.','G₂ converge para 1, com sobressinal próximo de 37,2%; compare a acomodação medida com 6,67 s, que é uma aproximação.'],
    experiment:'Mantenha ωₙ=2 e altere ζ para 0,6: use o denominador s²+2,4s+4. Compare pico e acomodação sem mudar o ganho estático.',
    answer:'A estabilidade exige decaimento dos modos; um amortecimento pequeno permite muitas oscilações antes desse decaimento se tornar perceptível. Estabilidade e qualidade do transitório são critérios distintos.',
    reading:[{ref:'analysis',section:'Second-Order Systems: polos, sobressinal e tempos de resposta.'},fbs('Transfer_Functions','Cap. 9: funções de transferência e comportamento dinâmico.')],
  },
  4:{
    concepts:[
      {title:'Analise os polos da malha que você realmente fechou',text:'Com realimentação unitária negativa e controlador proporcional K, a transferência é KG/(1+KG). Se G=N/D, o polinômio característico é D+KN. É esse polinômio que determina os modos da malha fechada, antes de qualquer cancelamento algébrico.'},
      {title:'Routh permite contar polos instáveis sem calcular todas as raízes',text:'Para o cúbico deste exemplo, escreva as duas primeiras linhas com os coeficientes alternados e calcule a primeira entrada da terceira linha. Para estabilidade estrita, todos os elementos da primeira coluna devem ter o mesmo sinal positivo. Uma linha nula ou um elemento inicial nulo exige tratamento especial; aqui vamos analisar as fronteiras separadamente.'},
      {title:'Uma transferência simplificada pode esconder um modo',text:'Cancelar um polo instável ou marginal com um zero não torna o sistema internamente estável. Mesmo quando a transferência de uma entrada para uma saída parece estável, condições iniciais ou perturbações em outros pontos podem revelar o modo oculto.'},
    ],
    formulas:[
      {label:'Polinômio característico',tex:math`G(s)=\frac1{s(s+1)(s+2)},\quad T(s)=\frac K{s^3+3s^2+2s+K}`,meaning:'O ganho K é escalar e a realimentação é unitária negativa.'},
      {label:'Tabela de Routh',tex:math`\begin{array}{c|cc}s^3&1&2\\s^2&3&K\\s^1&(6-K)/3&0\\s^0&K&0\end{array}\qquad\Longrightarrow\qquad 0<K<6`,meaning:'A primeira coluna é positiva somente no intervalo aberto. K=0 e K=6 não dão estabilidade assintótica.'},
    ],
    example:{title:'Por que K=6 é uma fronteira?',steps:['Monte o denominador D=s(s+1)(s+2)=s³+3s²+2s.','Some K e calcule o termo da linha s¹: (3·2−1·K)/3=(6−K)/3.','Exija simultaneamente K>0 e 6−K>0. Resulta 0<K<6.','Em K=6, o polinômio fatoriza como (s+3)(s²+2): há polos ±j√2. Em K=0, há um polo na origem. Em K=7, a primeira coluna tem duas mudanças de sinal e há dois polos no semiplano direito.'],conclusion:'K=1 e K=5 são estáveis; K=7 é instável. As fronteiras não pertencem ao intervalo de estabilidade estrita.'},
    code:math`clear; close all; clc;
s = tf('s'); G = 1/(s*(s+1)*(s+2));
for K = [1 5 7]
    polos = roots([1 3 2 K]);
    fprintf('K = %g; estavel = %d\n',K,all(real(polos)<0));
    disp(polos);
end
figure; step(feedback(G,1),feedback(5*G,1),0:0.05:100);
grid on; legend('K=1','K=5');
% A resposta para K=7 cresce; avalie em janela separada.
figure; step(feedback(7*G,1),0:0.01:30); grid on;`,
    expected:['As raízes de K=1 e K=5 têm parte real negativa.','K=7 tem dois polos com parte real positiva; não aplique o teorema do valor final a essa resposta.'],
    experiment:'Calcule as raízes para K=5,9 e K=6,1. Observe como cruzam o eixo imaginário e compare com a tabela de Routh.',
    answer:'Não. Fechar a malha altera o polinômio característico. Uma planta estável pode ficar instável com um controlador inadequado; uma planta instável pode ser estabilizada por um controlador apropriado.',
    reading:[fbs('Frequency_Domain_Analysis','Cap. 10: estabilidade em malha fechada; a tabela de Routh acima é uma dedução própria para o cúbico do exercício.'),{ref:'locus',section:'Relação entre ganho e polos da malha fechada.'}],
  },
  5:{
    concepts:[
      {title:'Erro estacionário é uma propriedade da malha e da entrada',text:'Com realimentação unitária, E/R=1/(1+CG). Para uma referência em degrau unitário, R=1/s. O teorema do valor final permite calcular o limite do erro se todos os polos de sE(s) estiverem estritamente no semiplano esquerdo. Verifique também a estabilidade interna; não use o limite algébrico para justificar uma malha instável.'},
      {title:'Proporcional precisa de erro para sustentar a ação',text:'Com u=Kₚe, manter uma ação constante não nula exige erro constante não nulo. No exemplo, a saída desejada é 1, mas a planta precisa de u=0,5 para sustentá-la. Com Kₚ=2, o controle proporcional sozinho encontra um equilíbrio com y=0,8 e u=0,4.'},
      {title:'O integrador acumula a ação necessária',text:'A ação integral pode manter uma saída de controle não nula mesmo quando o erro chega a zero. Essa conclusão exige malha estável, referência compatível com o atuador e ausência de efeitos não modelados que invalidem a análise. Nos ganhos escolhidos ocorre um cancelamento exato de um polo estável; ele é uma particularidade didática, sensível a erros de modelo.'},
    ],
    formulas:[
      {label:'Controle proporcional',tex:math`C_P=2,\quad T_P=\frac4{10s+5}=\frac{0{,}4}{s+0{,}5},\quad e_{\infty,P}=\frac1{1+K_pG(0)}=\frac15`,meaning:'Para degrau unitário, y∞=0,8. A constante de tempo fechada é 2 s.'},
      {label:'Controle proporcional e integral',tex:math`C_{PI}=2+\frac{0{,}2}{s},\quad T_{PI}=\frac{4s+0{,}4}{10s^2+5s+0{,}4}=\frac{0{,}4}{s+0{,}4},\quad e_{\infty,PI}=0`,meaning:'O denominador não reduzido tem polos −0,1 e −0,4 s⁻¹. O zero −0,1 cancela um polo estável na transferência referência–saída, com condições iniciais nulas.'},
    ],
    example:{title:'Calcule o resultado antes de simular',steps:['Para P: G(0)=2 e Kₚ=2. O ganho de malha em regime é 4, então e∞=1/5=0,2.','Para PI: multiplique 1+CG por s(10s+1). O denominador fica 10s²+5s+0,4=10(s+0,1)(s+0,4).','Os dois polos são estáveis. Para entrada unitária, a expressão reduzida dá y(t)=1−e^(−0,4t).','A saída PI chega a 1 e a ação converge a 0,5. A resposta P converge a 0,8; não confunda acomodação em torno de 0,8 com rastreamento da referência 1.'],conclusion:'Neste caso, o PI elimina o erro sem sobressinal. Não conclua que ação integral sempre preserva esse transitório: outros ganhos podem produzir oscilação.'},
    code:math`clear; close all; clc;
s = tf('s'); G = 2/(10*s+1);
CP = 2; CPI = 2+0.2/s;
TP = feedback(CP*G,1); TPI = feedback(CPI*G,1);
t = (0:0.05:60)';
step(TP,TPI,t); grid on; legend('P','PI');
disp('Polos antes da simplificacao:'); disp(pole(TPI));
disp('Transferencia reduzida:'); disp(minreal(TPI));
fprintf('Erros de regime: P=%.3f, PI=%.3f\n',1-dcgain(TP),1-dcgain(TPI));`,
    expected:['Os erros de regime previstos são 0,2 e zero.','O polo cancelado é estável, mas pode reaparecer na resposta se os parâmetros da planta mudarem.'],
    experiment:'Mantenha Kₚ=2 e aumente Kᵢ para 1. Recalcule o denominador antes de simular e procure mudança no amortecimento e no sobressinal.',
    answer:'O integrador acrescenta um estado e muda o polinômio característico. Ele pode remover o erro constante, mas também alterar amortecimento, acomodação e esforço de controle.',
    reading:[{ref:'pid',section:'Ações proporcional e integral; efeitos sobre o erro de regime.'},fbs('PID_Control','Cap. 11: ações básicas de controle e integral.')],
  },
  6:{
    concepts:[
      {title:'Reconstrua a cadeia de raciocínio',text:'Tente ir da equação diferencial à resposta sem olhar as sessões anteriores. Escreva quais hipóteses permitiram cada passagem: linearidade, invariância no tempo, repouso inicial e realimentação unitária. Se um passo não sair, registre exatamente onde o raciocínio parou.'},
      {title:'Separe três perguntas',text:'Estabilidade: os modos decaem? Rapidez: quanto tempo o transitório leva? Precisão: qual erro permanece para a entrada escolhida? Uma curva pode ser estável e rápida, mas convergir ao valor errado. É o que ocorre com o controle P do exemplo.'},
    ],
    formulas:[{label:'Três verificações distintas',tex:math`\operatorname{Re}(p_i)<0,\qquad t_{\mathrm{acom},2\%}\approx4\tau,\qquad e_\infty=\lim_{s\to0}sE(s)`,meaning:'A segunda expressão é uma aproximação para uma primeira ordem; a terceira requer as condições do teorema do valor final. Não são regras universais sem hipóteses.'}],
    example:{title:'Uma resposta rápida que não chega à referência',steps:['Recupere Tₚ=0,4/(s+0,5). O polo −0,5 é estável.','A constante de tempo é 2 s; a acomodação a 2% do valor final é aproximadamente 7,82 s.','O ganho final é 0,8. Para referência 1, o erro final é 0,2.','Anote separadamente: estável; relativamente rápida; erro permanente de 20% da referência unitária.'],conclusion:'“Acomodou” e “atingiu a referência” não significam a mesma coisa. A faixa usada para medir acomodação precisa estar explícita.'},
    expected:['Uma dedução de G=2/(10s+1) feita sem consulta.','Uma explicação própria para os erros de P e PI, mais duas dúvidas específicas.'],
    experiment:'Em uma página, desenhe a malha e refaça os dias 2 e 5. Depois consulte a resolução e marque a primeira etapa em que houve divergência.',
    answer:'Um polo negativo indica decaimento; sua distância da origem influencia a rapidez; o ganho em regime e o tipo de entrada determinam o erro. Nenhum desses critérios substitui os outros.',
    reading:[fbs('Transfer_Functions','Retome o cap. 9 apenas nos passos em que houve dúvida.'),{ref:'analysis',section:'Releia as definições das métricas, se necessário.'}],
  },
  7:{
    concepts:[
      {title:'Descreva a planta antes de escolher um modelo',text:'Registre o processo físico, a grandeza manipulada, a saída medida e o mecanismo que liga as duas. Identifique os limites do atuador e o intervalo de operação do sensor. Se algo ainda não foi informado, escreva “não confirmado”; um campo em branco não distingue desconhecimento de esquecimento.'},
      {title:'Cada número precisa de unidade e origem',text:'Para um parâmetro recebido, registre valor, unidade, fonte, data e condição de operação. Uma foto pode documentar uma ligação, mas não comprova sozinha calibração, precisão ou taxa de amostragem. Associe cada arquivo enviado ao experimento ou assunto correspondente.'},
      {title:'Separe observação e hipótese',text:'“O laboratório enviou um modelo de primeira ordem” é uma informação sobre um arquivo. “A planta é de primeira ordem” exige evidência no intervalo de operação estudado. O modelo didático do caderno não fornece parâmetros da planta real.'},
    ],
    formulas:[{label:'Desvios em torno de um ponto de operação',tex:math`\Delta u(t)=u(t)-u_0,\qquad \Delta y(t)=y(t)-y_0,\qquad \Delta Y(s)=G(s)\Delta U(s)`,meaning:'u₀ e y₀ representam um equilíbrio confirmado. A última relação só será aplicável se um modelo linear local e suas hipóteses forem sustentados pelos dados.'}],
    example:{title:'Transformar uma informação incompleta em uma pendência útil',steps:['Informação recebida: “o atuador recebe uma tensão”. Registre isso com a origem.','Pendências: faixa de tensão, relação com a grandeza física, saturação, sentido da atuação e possibilidade de desligamento.','Informação recebida: “há um código MATLAB antigo”. Envie o arquivo na categoria MATLAB e descreva quem forneceu e a finalidade informada.','Antes de reutilizar o código, confirme unidades, versão, dependências e condições do experimento original.'],conclusion:'A entrega desta sessão pode ser uma ficha parcial com pendências claras. Não é necessário inventar parâmetros para preencher todos os campos.'},
    expected:['Uma relação de entradas, saídas, sensores e atuadores com unidades ou pendências.','Origem e data das informações confirmadas; arquivos associados ao assunto da pesquisa.'],
    experiment:'Preencha a aba Planta experimental. Na seção Upload de arquivos, guarde os materiais já recebidos e use o mesmo assunto para identificar itens relacionados.',
    answer:'Fato confirmado tem fonte rastreável e condição de validade. Hipótese é uma proposta ainda não verificada. Mantenha essa distinção no relatório e na ficha da planta.',
    reading:[fbs('System_Modeling','Cap. 3: conceitos e metodologia de modelagem. Use como apoio à organização; os dados reais virão do laboratório.')],
  },
  8:{
    concepts:[
      {title:'Três ações, três mecanismos',text:'A ação proporcional reage ao erro atual. A integral acumula erro e sustenta a ação necessária em regime. A derivativa reage à taxa de variação e pode ajudar no amortecimento, mas também reage fortemente a variações rápidas e ruído. O efeito de aumentar cada ganho depende da planta e dos demais ganhos; uma tabela de tendências não substitui análise.'},
      {title:'Especifique a forma do PID',text:'Aqui usamos a forma paralela com derivada filtrada. Kᵢ não é o tempo integral Tᵢ: quando Kᵢ≠0, Tᵢ=Kₚ/Kᵢ. O filtro T_f>0 limita o ganho da parcela derivativa em alta frequência. Neste código, a derivada atua sobre o erro; um degrau de referência produz uma ação inicial elevada. Derivar a medição é uma alternativa de implementação, fora desta comparação.'},
      {title:'Saturação muda o problema',text:'Se o atuador limita u, o comando pedido e o aplicado podem diferir. O integrador pode continuar crescendo durante essa diferença, causando windup e recuperação lenta. Uma estratégia anti-windup deve usar a limitação dentro da dinâmica do controlador. Cortar o gráfico de u depois de simular não reproduz uma malha saturada.'},
    ],
    formulas:[
      {label:'PI e PID na mesma convenção',tex:math`C_{PI}(s)=K_p+\frac{K_i}{s},\qquad C_{PID}(s)=K_p+\frac{K_i}{s}+\frac{K_ds}{T_fs+1},\qquad T_f>0`,meaning:'Kₚ tem unidades u/e; Kᵢ, u/(e·s); K_d, u·s/e; T_f é dado em segundos.'},
      {label:'Saída e esforço para a referência',tex:math`\frac YR=\frac{CG}{1+CG},\qquad \frac UR=\frac C{1+CG},\qquad \lim_{\omega\to\infty}\frac{K_dj\omega}{1+T_fj\omega}=\frac{K_d}{T_f}`,meaning:'Malha unitária negativa, linear e sem saturação. O ganho derivativo é limitado pelo filtro, mas pode continuar grande.'},
    ],
    example:{title:'Um PID de comparação, não uma sintonia da planta',steps:['Mantenha G=2/(10s+1), P com Kₚ=2 e PI com Kₚ=2 e Kᵢ=0,2.','Para o terceiro caso, escolha K_d=0,5 e T_f=0,1 s. São valores didáticos para observar o efeito da derivada filtrada.','A parcela derivativa tem ganho de alta frequência K_d/T_f=5. Somada ao proporcional, pode gerar u(0⁺)=7 para um degrau unitário e planta estritamente própria em repouso.','Compare erro, acomodação, sobressinal, pico de |u| e variação total. Uma melhora na saída não justifica automaticamente uma ação maior no atuador.'],conclusion:'O controlador mais complexo precisa mostrar benefício nos critérios do problema. Este ensaio linear não demonstra desempenho com saturação ou ruído real.'},
    code:math`clear; close all; clc;
s = tf('s'); G = 2/(10*s+1);
Cs = {tf(2), 2+0.2/s, 2+0.2/s+0.5*s/(0.1*s+1)};
nomes = {'P','PI','PID filtrado'};
t = (0:0.005:80)'; r = ones(size(t));
for j = 1:numel(Cs)
    C = Cs{j}; Ty = feedback(C*G,1); Tu = feedback(C,G);
    assert(isstable(Ty),'A malha precisa ser estavel.');
    y = lsim(Ty,r,t); u = lsim(Tu,r,t);
    m = stepinfo(y,t,dcgain(Ty),'SettlingTimeThreshold',0.02);
    fprintf('%s: erro=%.4f; OS=%.2f%%; acomodacao=%.3fs; max|u|=%.3f; TV=%.3f\n', ...
        nomes{j},1-dcgain(Ty),m.Overshoot,m.SettlingTime,max(abs(u)),sum(abs(diff(u))));
    figure(1); subplot(2,1,1); plot(t,y); hold on;
    subplot(2,1,2); plot(t,u); hold on;
end
subplot(2,1,1); grid on; ylabel('Saida'); legend(nomes);
subplot(2,1,2); grid on; ylabel('Controle'); xlabel('Tempo (s)'); legend(nomes);
% TV nao inclui o salto de u(0-) para u(0+). Sem saturacao.`,
    expected:['O erro P é 0,2; os casos PI e PID estáveis têm erro de regime zero ao degrau.','A ação inicial do PID deste exemplo é maior. Compare a saída e o atuador antes de concluir.'],
    experiment:'Mude apenas K_d de 0,5 para 0,1. Depois restaure K_d e aumente T_f para 0,2 s. Registre o efeito esperado e o observado em cada caso.',
    answer:'A decisão depende dos limites e do custo de atividade do atuador. Um transitório ligeiramente melhor pode ser inaceitável se exigir comando excessivo ou ampliar o ruído.',
    reading:[{ref:'pid',section:'Estrutura PID e comparação das ações de controle.'},fbs('PID_Control','Cap. 11: ações básicas, windup e implementação com derivada filtrada.')],
  },
  9:{
    concepts:[
      {title:'Cada ponto do lugar corresponde a polos para algum ganho',text:'O lugar das raízes reúne as soluções de 1+KG(s)=0 quando K varia de zero a infinito. Trace o lugar usando a função de malha sem o ganho variável. Ele não é o conjunto dos polos da planta depois de multiplicar simplesmente por K; multiplicar o numerador não desloca polos de malha aberta.'},
      {title:'Leia a parte real antes de julgar o ganho',text:'Polos mais perto do eixo imaginário podem gerar oscilações que demoram a desaparecer. Um ganho maior pode acelerar alguma etapa da resposta e, simultaneamente, piorar a acomodação. O lugar ajuda a enxergar esse conflito, mas zeros e resíduos também afetam a forma temporal.'},
    ],
    formulas:[
      {label:'Equação do lugar',tex:math`1+\frac K{s(s+1)(s+2)}=0\quad\Longleftrightarrow\quad s^3+3s^2+2s+K=0`,meaning:'É o mesmo polinômio do dia 4: as duas ferramentas precisam produzir conclusões compatíveis.'},
      {label:'Polos para dois ganhos',tex:math`\begin{aligned}K=1:&\quad -2{,}3247,\quad -0{,}3376\pm j0{,}5623\\K=5:&\quad -2{,}9042,\quad -0{,}04792\pm j1{,}3112\end{aligned}`,meaning:'O par complexo de K=5 está mais próximo do eixo imaginário: sua envoltória decai muito mais lentamente.'},
    ],
    example:{title:'Confrontar o gráfico com Routh',steps:['Marque os polos de malha aberta em 0, −1 e −2. São os pontos iniciais para K→0⁺.','Em K=1, o par dominante tem taxa de decaimento aproximada de 0,338 s⁻¹.','Em K=5, a taxa cai para aproximadamente 0,0479 s⁻¹. A resposta continua estável, mas a oscilação é persistente.','Em K=6, o par chega a ±j√2. Para K>6, entra no semiplano direito, em acordo com Routh.'],conclusion:'Aumentar K não significa melhorar todas as métricas. O intervalo estável é necessário, mas ainda precisamos escolher um desempenho aceitável dentro dele.'},
    code:math`clear; close all; clc;
s = tf('s'); G = 1/(s*(s+1)*(s+2));
figure; rlocus(G); hold on;
p1 = pole(feedback(G,1)); p5 = pole(feedback(5*G,1));
plot(real(p1),imag(p1),'ro','MarkerSize',8);
plot(real(p5),imag(p5),'ks','MarkerSize',8); grid on;
title('Lugar das raizes: circulos K=1; quadrados K=5');
figure; step(feedback(G,1),feedback(5*G,1),0:0.05:120);
grid on; legend('K=1','K=5');`,
    expected:['O gráfico de K=5 precisa de uma janela longa para mostrar a acomodação.','O cruzamento do eixo imaginário ocorre em K=6, compatível com a análise algébrica.'],
    experiment:'Acrescente K=3 aos dois gráficos. Explique sua posição entre os casos anteriores em termos de polos, oscilação e acomodação.',
    answer:'Os polos não se movem obrigatoriamente para a esquerda quando K aumenta. Neste exemplo, o par complexo aproxima-se do eixo imaginário e depois cruza para a região instável.',
    reading:[{ref:'locus',section:'Traçado do lugar e seleção do ganho.'},fbs('Frequency_Domain_Design','Cap. 12: método do lugar das raízes.')],
  },
  10:{
    concepts:[
      {title:'Bode descreve a resposta a senoides',text:'Para um sistema linear, G(jω) informa a razão de amplitudes e a defasagem em uma frequência. O módulo em decibéis é 20 log₁₀|G(jω)|. Ao estudar estabilidade por margens, use a função de malha L=CG; a transferência referência–saída é T=L/(1+L) e responde a outra pergunta.'},
      {title:'Margens medem distância até uma condição crítica',text:'A margem de fase é a fase adicional que pode ser perdida no cruzamento de ganho unitário antes de alcançar −180°. A margem de ganho usa o cruzamento de fase em −180°. Sistemas com múltiplos cruzamentos, polos instáveis de malha aberta ou cancelamentos exigem análise completa; um número positivo isolado não é garantia universal.'},
      {title:'Um atraso tira fase sem alterar o módulo',text:'Um atraso puro de T_d segundos multiplica a malha por exp(−sT_d). Sua fase é −ωT_d em radianos. Quanto maior a frequência, maior a perda de fase. Para o PI nominal desta trilha, o cancelamento estável simplifica L a 0,4/s, o que permite conferir a margem manualmente.'},
    ],
    formulas:[
      {label:'Margem de fase e atraso',tex:math`|L(j\omega_c)|=1,\quad M_\varphi=180^\circ+\arg L(j\omega_c),\quad \Delta\varphi=-\omega T_d\frac{180^\circ}{\pi}`,meaning:'ω_c é o cruzamento de ganho; use fase em graus nesta expressão de margem. T_d é atraso puro, não constante de tempo.'},
      {label:'Conferência para o PI nominal',tex:math`L(s)=\frac{0{,}4}{s},\quad \omega_c=0{,}4\,\mathrm{rad/s},\quad M_\varphi(T_d)=90^\circ-0{,}4T_d\frac{180^\circ}{\pi}`,meaning:'Sem atraso: 90°. Com 1 s: aproximadamente 67,08°. Com 3 s: aproximadamente 21,25°. O limite de atraso deste caso ideal é π/(2·0,4)≈3,927 s.'},
    ],
    example:{title:'Um segundo e três segundos de atraso',steps:['Escreva C=2(s+0,1)/s e G=0,2/(s+0,1); o produto nominal reduz-se a 0,4/s.','No cruzamento de ganho, 0,4/ω=1, logo ω_c=0,4 rad/s. A fase sem atraso é −90°.','Para 1 s de atraso, a perda é 0,4 rad≈22,92°. Para 3 s, é 1,2 rad≈68,75°.','As margens caem para 67,08° e 21,25°. O atraso de 3 s deixa a resposta mais oscilatória; o ganho estático da planta continua igual.'],conclusion:'Atrasos podem degradar a estabilidade sem mudar o valor de regime previsto. O limite calculado depende deste modelo nominal exato.'},
    code:math`clear; close all; clc;
s = tf('s'); G = 2/(10*s+1); C = 2+0.2/s;
figure; margin(C*G); grid on;
figure; hold on;
for Td = [0 1 3]
    Gd = tf(2,[10 1],'InputDelay',Td);
    Ld = C*Gd;
    [GM,PM,~,Wcp] = margin(Ld);
    fprintf('Atraso %.1fs: GM=%g; PM=%.2f graus; wc=%.3f rad/s\n',Td,GM,PM,Wcp);
    [y,t] = step(feedback(Ld,1),0:0.02:80);
    plot(t,y);
end
grid on; xlabel('Tempo (s)'); ylabel('Saida'); legend('0 s','1 s','3 s');
% GM retornado por margin e uma razao, nao um valor em dB.`,
    expected:['As margens de fase devem se aproximar de 90°, 67,08° e 21,25°.','A ausência de cruzamento de −180° no caso nominal sem atraso produz margem de ganho infinita; isso não significa tolerância a qualquer atraso.'],
    experiment:'Use T_d=3,5 s e estime a nova margem antes de rodar. Compare com a resposta temporal, mantendo todos os outros parâmetros.',
    answer:'O atraso acrescenta defasagem à correção. Perto da frequência crítica, a ação pode chegar tarde e reforçar a oscilação, embora exp(0)=1 preserve o ganho em frequência zero.',
    reading:[{ref:'frequency',section:'Bode, cruzamentos e margens de estabilidade.'},fbs('Frequency_Domain_Analysis','Cap. 10: função de malha, Nyquist e margens de estabilidade.')],
  },
  11:{
    concepts:[
      {title:'Defina as entradas antes de escolher a transferência',text:'Vamos usar perturbação d somada à entrada da planta e ruído n somado à medição. Assim, a planta recebe u+d e o controlador recebe e=r−y−n. Uma perturbação somada à saída teria outra transferência. Um teste só é reproduzível se esse ponto de entrada estiver explícito.'},
      {title:'Sensibilidade e sensibilidade complementar se completam',text:'S=1/(1+L) relaciona a referência ao erro quando não há ruído. T=L/(1+L) relaciona a referência à saída. Como S+T=1, não é possível tornar os dois pequenos na mesma frequência. Projetos usuais buscam bom rastreamento em baixa frequência e menor transmissão de ruído em alta frequência, respeitando estabilidade e limitações.'},
      {title:'Robustez começa com cenários bem definidos',text:'Mantenha o controlador fixo e varie separadamente o ganho ou a constante de tempo em ±20%. Se retunar o controlador para cada caso, estará comparando projetos diferentes. Os cinco cenários abaixo são testes locais de sensibilidade, não uma prova de robustez para toda incerteza possível.'},
    ],
    formulas:[
      {label:'Transferências de saída',tex:math`S=\frac1{1+CG},\quad T=\frac{CG}{1+CG},\quad S+T=1,\qquad Y=TR+GSD-TN`,meaning:'Realimentação unitária negativa, perturbação na entrada da planta e ruído aditivo de medição. Sinais em Laplace e condições iniciais nulas.'},
      {label:'Transferências do comando',tex:math`U=CSR-CGSD-CSN`,meaning:'A ação aplicada pelo controlador u não inclui d. O termo CGS distingue rejeição de perturbação de rastreamento de referência.'},
    ],
    example:{title:'Um degrau de perturbação de 0,2 unidade',steps:['No modelo nominal, G=2/(10s+1) e o PI é C=2+0,2/s. A referência é 1.','Em t=30 s, some d=0,2 à entrada da planta. O controlador precisa compensar esse acréscimo.','Se o regime estável é recuperado, a entrada total exigida pela planta continua 0,5. Logo u∞=0,5−0,2=0,3.','Acrescente ruído de desvio padrão 0,01 com semente fixa para outro ensaio. Compare a variação de u; não interprete uma única amostra de ruído como resultado estatístico geral.'],conclusion:'Rejeitar uma perturbação significa restaurar a saída com uma nova ação de controle. É preciso observar ambos os sinais.'},
    code:math`clear; close all; clc; rng(7);
s = tf('s'); C = 2+0.2/s;
casos = [2 10; 1.6 10; 2.4 10; 2 8; 2 12]; % ganho, tau
nomes = {'Nominal','Ganho -20%','Ganho +20%','Tau -20%','Tau +20%'};
t = (0:0.05:100)'; r = ones(size(t)); d = 0.2*double(t>=30);
n = zeros(size(t)); % depois teste n = 0.01*randn(size(t));
for j = 1:size(casos,1)
    G = casos(j,1)/(casos(j,2)*s+1);
    S = feedback(1,C*G); T = feedback(C*G,1);
    assert(isstable(T),'Cenario instavel.');
    y = lsim(T,r,t)+lsim(G*S,d,t)-lsim(T,n,t);
    u = lsim(C*S,r,t)-lsim(C*G*S,d,t)-lsim(C*S,n,t);
    fprintf('%s: e_final=%.4f; IAE=%.3f; TVu=%.3f\n', ...
        nomes{j},r(end)-y(end),trapz(t,abs(r-y)),sum(abs(diff(u))));
    figure(1); subplot(2,1,1); plot(t,y); hold on;
    subplot(2,1,2); plot(t,u); hold on;
end
subplot(2,1,1); grid on; ylabel('Saida'); legend(nomes);
subplot(2,1,2); grid on; ylabel('Controle'); xlabel('Tempo (s)'); legend(nomes);`,
    expected:['Sem ruído, o PI estável recupera a referência nos cinco cenários.','No caso nominal, a ação tende a 0,3 após a perturbação. Com ganho diferente, esse valor de equilíbrio também muda.'],
    experiment:'Rode primeiro sem ruído. Depois habilite o ruído com a mesma semente e amplitude para todos os cenários. Separe nas conclusões a incerteza paramétrica e o ruído.',
    answer:'Uma boa sintonia nominal precisa ser avaliada nos cenários relevantes. Nesta família de plantas, o cancelamento nominal deixa de ser exato quando τ muda, embora a estabilidade possa permanecer.',
    reading:[fbs('Frequency_Domain_Design','Cap. 12: funções de sensibilidade e respostas a perturbação e ruído.'),fbs('Robust_Performance','Cap. 13: incerteza e desempenho robusto.'),{ref:'frequency',section:'Interpretação em frequência das limitações da malha.'}],
  },
  12:{
    concepts:[
      {title:'Reproduzir exige registrar as escolhas',text:'Um estudo comparativo precisa do modelo, controlador, entrada, condições iniciais, duração e passo de tempo. Use esses elementos iguais entre P e PI. Aqui simulamos modelos contínuos; o passo da grade de simulação não converte o controlador em um controlador digital.'},
      {title:'Métricas respondem a perguntas diferentes',text:'IAE acumula o módulo do erro no intervalo observado. TVu acumula as mudanças do controle entre amostras e mede atividade, não energia. A acomodação calculada por stepinfo usa o valor final da própria resposta; para P, esse valor é 0,8. Reporte também o erro em relação à referência 1.'},
      {title:'Conclusões devem carregar suas limitações',text:'Uma comparação linear sem saturação, atrasos ou ruído não comprova viabilidade na bancada. Os ganhos são didáticos. Salve o script e os parâmetros junto dos resultados; registre se uma curva é simulação ou medição experimental.'},
    ],
    formulas:[
      {label:'Erro integrado e atividade do controle',tex:math`\mathrm{IAE}(t_f)=\int_0^{t_f}|r(t)-y(t)|\,dt,\qquad \mathrm{TV}_u=\sum_{k=1}^{N}|u[k]-u[k-1]|`,meaning:'No código, trapz aproxima a integral. TVu começa entre as amostras t=0 e t=Δt; não inclui o salto anterior a t=0. Mantenha a convenção igual em todos os casos.'},
      {label:'Resultados analíticos deste ensaio',tex:math`\begin{aligned}y_P&=0{,}8(1-e^{-0{,}5t}),&u_P&=0{,}4+1{,}6e^{-0{,}5t}\\y_{PI}&=1-e^{-0{,}4t},&u_{PI}&=0{,}5+1{,}5e^{-0{,}4t}\end{aligned}`,meaning:'Degrau unitário, modelo nominal e repouso inicial. Em 80 s, IAEₚ≈17,6 e IAEₚᵢ≈2,5. TVu≈1,6 e 1,5, excluindo o salto inicial.'},
    ],
    example:{title:'Uma conclusão que pode ser auditada',steps:['Especifique: G=2/(10s+1), referência unitária, 80 s de duração e grade de 0,05 s.','Use P=2 e PI=2+0,2/s. Registre que não há saturação nem perturbações neste ensaio.','Compare os números com a solução analítica: erro estacionário 0,2 versus zero e IAE em 80 s próximo de 17,6 versus 2,5.','Escreva: “Neste modelo e cenário, o PI reduziu o erro integrado e eliminou o erro constante”. Não escreva que isso prova superioridade universal ou valida a planta.'],conclusion:'O resultado fica forte quando outra pessoa consegue reconstruir tanto a simulação quanto as condições que limitam a conclusão.'},
    code:math`% Comparacao reproduzivel P x PI. MATLAB + Control System Toolbox.
clear; close all; clc;
K = 2; tau = 10; Kp = 2; Ki = 0.2;
dt = 0.05; tfinal = 80;
s = tf('s'); G = K/(tau*s+1);
Cs = {tf(Kp),Kp+Ki/s}; nomes = {'P';'PI'};
t = (0:dt:tfinal)'; r = ones(size(t));
metricas = zeros(2,6);
for j = 1:2
    C = Cs{j}; Ty = feedback(C*G,1); Tu = feedback(C,G);
    assert(isstable(Ty),'Malha instavel.');
    y = lsim(Ty,r,t); u = lsim(Tu,r,t);
    info = stepinfo(y,t,dcgain(Ty),'SettlingTimeThreshold',0.02);
    metricas(j,:) = [1-dcgain(Ty),trapz(t,abs(r-y)),sum(abs(diff(u))), ...
        max(abs(u)),info.Overshoot,info.SettlingTime];
    sinais = table(t,r,y,u,'VariableNames',{'t_s','r','y','u'});
    writetable(sinais,['sinais_' nomes{j} '.csv']);
    figure(1); subplot(2,1,1); plot(t,y); hold on;
    subplot(2,1,2); plot(t,u); hold on;
end
resultado = array2table(metricas,'VariableNames', ...
    {'Erro_regime','IAE','TVu','Pico_u','Sobressinal_pct','Acomodacao_s'},'RowNames',nomes);
disp(resultado); writetable(resultado,'metricas_P_PI.csv','WriteRowNames',true);
subplot(2,1,1); yline(1,'--'); grid on; ylabel('Saida'); legend('P','PI','Referencia');
subplot(2,1,2); grid on; ylabel('Controle'); xlabel('Tempo (s)'); legend(nomes);
save('ensaio_P_PI.mat','K','tau','Kp','Ki','dt','tfinal','resultado');
% Os arquivos sao gravados na pasta atual do MATLAB.
% Acomodacao e relativa ao valor final de cada resposta; TVu exclui salto inicial.`,
    expected:['Tabela com IAE próximo de 17,6 para P e 2,5 para PI; pequenas diferenças vêm da integração numérica.','Arquivos CSV de sinais e métricas, mais um MAT com parâmetros. Nenhum resultado experimental é gerado por este código.'],
    experiment:'Reduza dt para 0,025 s e confira a convergência das métricas. Depois dobre a duração: o IAE de P continua crescendo devido ao erro permanente.',
    answer:'O script, os parâmetros e a definição das métricas precisam bastar para reproduzir o ensaio. Dependências do MATLAB, unidades e limitações devem acompanhar a entrega.',
    reading:[{ref:'pid',section:'Comparação dos controladores com critérios definidos.'},{ref:'digital',section:'Leitura introdutória: distinguir simulação contínua e implementação digital; o motor do tutorial não é a planta desta pesquisa.'}],
  },
  13:{
    concepts:[
      {title:'Explique uma escolha, não apenas uma definição',text:'Para cada conceito, escreva uma frase ligando causa, efeito e condição de validade. Por exemplo: “A integral pode eliminar erro constante ao degrau se a malha for estável e o atuador conseguir sustentar o regime”. Isso mostra mais compreensão do que repetir que integral reduz erro.'},
      {title:'Use um contraexemplo para testar a compreensão',text:'Se a frase for “aumentar o ganho sempre melhora”, use o cúbico dos dias 4 e 9. Se for “margem infinita significa estabilidade garantida”, use a introdução de atraso no dia 10. Se for “acomodação pequena significa bom rastreamento”, use o P do dia 5.'},
    ],
    formulas:[{label:'Duas identidades para reconstruir',tex:math`T=\frac L{1+L},\qquad S=\frac1{1+L},\qquad S+T=1`,meaning:'Considere a mesma malha unitária negativa dos dias anteriores. Explique que entrada e que saída cada função relaciona antes de usá-la.'}],
    example:{title:'Corrigir uma conclusão excessiva',steps:['Afirmação inicial: “O PI sempre será melhor porque remove o erro”.','Condição esquecida: estabilidade da malha. Ganhos integrais inadequados podem piorar o transitório ou desestabilizar outras plantas.','Outra limitação: saturação. A referência pode exigir uma ação impossível e produzir windup.','Conclusão revisada: “No cenário nominal linear ensaiado, este PI removeu o erro ao degrau; ainda preciso avaliar limites, atraso e incerteza”.'],conclusion:'Uma justificativa técnica inclui a evidência e também o domínio em que ela sustenta a escolha.'},
    expected:['Uma explicação própria para realimentação, polos, integral, saturação, margem de fase e atraso.','Dúvidas priorizadas por quanto impedem entender ou reproduzir um resultado.'],
    experiment:'Escolha a sessão mais difícil e refaça um cálculo antes de consultar o exemplo. Registre a correção e explique por que a tentativa inicial falhou.',
    answer:'Uma escolha defensável liga modelo, objetivo, métricas e limitações. Gráficos ilustram o resultado, mas não substituem hipóteses nem justificativa.',
    reading:[fbs('PID_Control','Retome ações de controle e windup conforme suas dúvidas.'),fbs('Frequency_Domain_Analysis','Retome margens e estabilidade, sem adicionar uma nova trilha de conteúdo.')],
  },
  14:{
    concepts:[
      {title:'Feche o que já foi demonstrado',text:'Separe no balanço: conceitos que consegue explicar, simulações que conseguiu reproduzir e informações confirmadas da planta. Uma curva do modelo didático pertence ao segundo grupo. Não a apresente como resposta medida do laboratório.'},
      {title:'A ponte para tempo discreto começa na amostragem',text:'Um controlador digital observa sinais em instantes separados e mantém uma ação entre atualizações. O período de amostragem depende da dinâmica relevante, dos sensores, do atuador e dos atrasos computacionais. Os valores abaixo servem apenas para entender a discretização da primeira ordem já estudada.'},
      {title:'Defina próximos passos a partir das lacunas reais',text:'Se ainda faltam entradas, saídas e limites da planta, priorize esse levantamento. Se já há dados e um modelo documentado, organize a verificação do modelo. A construção de predições será uma próxima trilha; aqui fazemos somente a ponte prevista no plano atual.'},
    ],
    formulas:[
      {label:'Primeira ordem com entrada mantida entre amostras',tex:math`y[k+1]=a\,y[k]+b\,u[k],\qquad a=e^{-T_s/\tau},\qquad b=K(1-e^{-T_s/\tau})`,meaning:'Discretização exata do modelo τ dy/dt+y=Ku quando u permanece constante em cada intervalo T_s (retenção de ordem zero), sem atraso adicional.'},
      {label:'Exemplo já conhecido, agora amostrado',tex:math`K=2,\quad\tau=10\,\mathrm{s},\quad T_s=0{,}1\,\mathrm{s}\quad\Longrightarrow\quad a\approx0{,}9900498,\quad b\approx0{,}0199003,\quad G_d(z)=\frac b{z-a}`,meaning:'T_s=0,1 s é uma escolha didática. Não foi estabelecido como período adequado à planta experimental.'},
    ],
    example:{title:'Prever um único passo',steps:['Use repouso inicial: y[0]=0. Aplique u[0]=1, mantido entre 0 e 0,1 s.','A recorrência fornece y[1]=b≈0,0199003.','Confira com a resposta contínua: 2(1−exp(−0,1/10)) produz exatamente o mesmo valor.','Repita para obter a sequência amostrada. Isso discretiza a planta; ainda não projeta nem valida um controlador digital.'],conclusion:'Uma previsão usa o estado/saída atual e a ação aplicada para calcular o próximo valor do modelo. A qualidade dessa previsão dependerá do modelo e das condições de amostragem.'},
    code:math`clear; close all; clc;
K = 2; tau = 10; Ts = 0.1;
a = exp(-Ts/tau); b = K*(1-a);
t = (0:Ts:60)'; y = zeros(size(t));
for k = 1:numel(t)-1
    y(k+1) = a*y(k)+b; % entrada unitaria mantida
end
y_cont = K*(1-exp(-t/tau));
plot(t,y,'o',t,y_cont,'-'); grid on;
xlabel('Tempo (s)'); ylabel('Saida'); legend('Recorrencia','Continuo amostrado');
fprintf('a=%.8f; b=%.8f; diferenca maxima=%.3g\n',a,b,max(abs(y-y_cont)));
% Conferencia adicional: requer Control System Toolbox.
G = tf(K,[tau 1]); Gd = c2d(G,Ts,'zoh'); disp(Gd);`,
    expected:['A recorrência coincide com a resposta contínua nos instantes amostrados, para este ensaio com retenção de ordem zero.','Um balanço da quinzena com três ações concretas relacionadas às pendências da planta.'],
    experiment:'Escreva três próximos passos com entrega verificável. Exemplos: confirmar limites do atuador, organizar um modelo recebido e documentar a taxa de aquisição disponível.',
    answer:'Há informação suficiente quando as variáveis, unidades, condições de operação e fontes do modelo estão claras para um primeiro teste. Se faltarem, registre a lacuna antes de atribuir parâmetros à planta.',
    reading:[{ref:'digital',section:'Modelo discreto e retenção de ordem zero. Observe que o tutorial trata de um motor, enquanto nossa conta usa a primeira ordem didática.'}],
  },
};
