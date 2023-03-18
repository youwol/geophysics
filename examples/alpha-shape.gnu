# gnuplot script
set terminal png size 1200,1000 enhanced font 'Helvetica bold,20'
set term png font "arial, 20"

# Line width of the axes
set border linewidth 1.5
# Line styles
set style line 1 linecolor rgb '#0060ad' linetype 1 linewidth 2
set style line 2 linecolor rgb '#dd181f' linetype 1 linewidth 2

set xrange [-pi/2:pi/2]
set yrange [0:1+sqrt(2)]
# Axes tics
set xtics ('-π/2' -pi/2, 0, 'π/4' pi/4, 'π/2' pi/2)
set ytics ('0' 0, '√2' sqrt(2), '1+√2' 1+sqrt(2))
set tics scale 0.75

set arrow from 0,0 to 0,1+sqrt(2) nohead
set arrow from pi/4,0 to pi/4,1+sqrt(2) nohead

set key left top
set title 'Principal stresses and α-shape'

a = sqrt(2)
f(x) = a + sin(x) - cos(x)
g(x) = a + sin(x)
h(x) = a

# Plot
plot f(x) title 'Sh' with lines lw 3 lc rgb 'red', \
     g(x) title 'SH' with lines lw 3 lc rgb 'green', \
     h(x) title 'Sv' with lines lw 3 lc rgb 'blue'
