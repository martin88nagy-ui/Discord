
// AI részecskék létrehozása

const particles = document.querySelector(".particles");


for (let i = 0; i < 40; i++) {

    const particle = document.createElement("span");

    particle.classList.add("particle");


    particle.style.left = Math.random() * 100 + "%";
    particle.style.top = Math.random() * 100 + "%";


    particle.style.animationDuration =
        (Math.random() * 10 + 5) + "s";


    particle.style.animationDelay =
        Math.random() * 5 + "s";


    particles.appendChild(particle);

}





// Egérkövető fény

const light = document.createElement("div");

light.classList.add("mouse-light");

document.body.appendChild(light);



document.addEventListener("mousemove", (event)=>{

    light.style.left = event.clientX + "px";
    light.style.top = event.clientY + "px";

});





// Statisztika animáció

const counters = document.querySelectorAll(".stat-card h2");


counters.forEach(counter=>{


    let target = 0;


    const update = ()=>{


        if(target < 0){

            target++;

            counter.innerText = target + "+";

            requestAnimationFrame(update);

        }


    };


});





// Scroll megjelenés

const elements = document.querySelectorAll(
    ".hero-card, .stat-card"
);



const observer = new IntersectionObserver(
(entries)=>{

    entries.forEach(entry=>{

        if(entry.isIntersecting){

            entry.target.classList.add("show");

        }

    });


},
{
    threshold:0.2
});



elements.forEach(el=>{

    observer.observe(el);

});





// Discord gomb kattintási effekt

const buttons = document.querySelectorAll(
".main-button,.nav-button"
);



buttons.forEach(button=>{


    button.addEventListener("click",()=>{


        button.style.transform="scale(.95)";


        setTimeout(()=>{

            button.style.transform="";

        },150);


    });


});