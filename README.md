# SIR like epidemic modeling
there is 0 reason this code should work 

This is a browser-based epidemic spread simulation inspired by the classic SIR model (Susceptible–Infected–Recovered)!!
You can tweak parameters, pick disease presets, and watch little circles bump into each other and infect each other. Perhaps later you can watch them run away from each other!! 

Runs entirely in your browser using HTML5 Canvas and vanilla JavaScript, next.js and react are lies by big tech to sell you more website
no frameworks no dependencies (no reason it should work)

[run it in your browser](https://mishalide.github.io/CirclePox)

# features include...
- Adjustable simulation parameters:
  - Population size
  - Infection radius and chance
  - Mortality chance
  - Infection decay rate and interval
  - Movement speed
  - Real-time stats for S, I, R, D counts and tick number
  - a light mode theme that fries your corneas and a dark mode thats almost okay
- some preset diseases for you to play around with
- Advanced mode!
  - Random spread cones (think sneezing)
  - Avoidance behavior (experimental)
  - Debug visualization of infection radii and spread cones
 
you can run this locally if you want for some reason; i've already added a dockerfile you can use, but it far easier to just change to the working directory and then type
> python -m http.server 8080

# known issues:
- The avoidance system “explodes” at populations >100 (technical term).
- Collision math is vibes-based and occasionally circles quantum-tunnel through each other and the walls (luckily they always return)
- it isn't medically accurate: please don't cite this in your epidemiology papers but if you do it would be REALLY funny
