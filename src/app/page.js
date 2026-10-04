import { redirect } from "next/navigation";

// La raíz no tiene pantalla propia: manda al login. Si ya hay una sesión
// iniciada, el login redirige solo al menú que le corresponde a su rol.
export default function Home() {
  redirect("/login");
}
