import Neprikosnovenna from "./projects/Neprikosnovenna/Neprikosnovenna"
import WhenYouSoBeautifullyDied from "./projects/Neprikosnovenna/WhenYouSoBeautifullyDied"

export const routes = [
    {
        path: "/neprikosnovenna",
        title: "Неприкосновенна",
        icon: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.jpg",
        description: "Проект 'Неприкосновенна' - художественная инсталляция",
        keywords: "искусство, инсталляция, неприкосновенна",
        ogImage: "/icons/ПОЛЬЩЕННАЯ.png",
        component: Neprikosnovenna,
    },
    {
        path: "/neprikosnovenna/when-you-so-beautifully-died",
        title: "Когда ты так прекрасно умирала",
        icon: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.jpg",
        description: "Проект 'Неприкосновенна' - художественная инсталляция",
        keywords: "искусство, инсталляция, неприкосновенна",
        ogImage: "/icons/ПОЛЬЩЕННАЯ.png",
        component: WhenYouSoBeautifullyDied,
    },
]
