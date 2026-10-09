import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LegalPageComponent } from './legal-page.component';
import { CONTACT_EMAIL } from '../../shared/legal';

@Component({
  selector: 'app-terms-page',
  imports: [LegalPageComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-page title="Regulamin">
      <p>Regulamin świadczenia usług drogą elektroniczną w serwisie znajdzgroby.pl. Serwis jest bezpłatny — bez opłat, subskrypcji i reklam.</p>

      <h2>1. Usługodawca</h2>
      <p>Usługi świadczy Kacper Kubit (dalej: „Usługodawca”). Kontakt: <a [href]="'mailto:' + contact">{{ contact }}</a>.</p>

      <h2>2. Co oferuje serwis</h2>
      <ol>
        <li><strong>Aplikacja</strong> — zapisywanie grobów bliskich (miejsce, osoby, zdjęcia, terminy opłat) w pamięci Twojego urządzenia, bez konta.</li>
        <li><strong>Mapy rodzinne</strong> — wspólna lista grobów dla osób, które mają link zaproszenia.</li>
        <li><strong>Konto</strong> — te same groby, zdjęcia i mapy rodzinne na każdym urządzeniu, na którym się zalogujesz.</li>
      </ol>
      <p>Umowa o korzystanie z aplikacji zawierana jest z chwilą rozpoczęcia korzystania, a w przypadku konta i mapy rodzinnej — z chwilą zaakceptowania regulaminu. Umowa jest zawierana na czas nieokreślony.</p>

      <h2>3. Wymagania techniczne</h2>
      <ul>
        <li>urządzenie z aktualną przeglądarką (Chrome, Safari, Firefox lub Edge) z włączoną obsługą JavaScript i pamięci strony,</li>
        <li>dostęp do internetu — do pierwszego uruchomienia, map rodzinnych i konta,</li>
        <li>adres e-mail — do założenia konta.</li>
      </ul>

      <h2>4. Konto</h2>
      <ol>
        <li>Konto może założyć osoba pełnoletnia. Do założenia konta potrzebny jest adres e-mail potwierdzony kodem wysłanym w wiadomości.</li>
        <li>Hasło trzymaj w tajemnicy. Jeśli ktoś mógł je poznać — ustaw nowe przez „Nie pamiętam hasła”.</li>
        <li>Konto usuniesz w każdej chwili w Ustawieniach („Usuń konto”) albo pisząc na {{ contact }}. Usunięcie kasuje konto i mapę „Moje” razem z grobami i zdjęciami; z map rodzinnych wychodzisz — dodane przez Ciebie groby zostają dla rodziny, rola założyciela przechodzi na osobę, która jest w mapie najdłużej, a mapa, w której nie ma już nikogo poza Tobą, jest usuwana — chyba że w ostatnich 30 dniach korzystały z niej telefony ze starszą wersją aplikacji; wtedy mapa zostaje dla nich.</li>
      </ol>

      <h2>5. Mapy rodzinne</h2>
      <ol>
        <li>Z mapy rodzinnej mogą korzystać osoby pełnoletnie.</li>
        <li>Link zaproszenia działa jak klucz: każdy, kto go ma, może dołączyć i zobaczyć groby. Udostępniaj go tylko zaufanym osobom. Założyciel mapy może zmienić link i usuwać osoby z mapy.</li>
        <li>Członkowie mapy widzą jej groby, zdjęcia, swoje podpisy (imię i kolor), to, kto ostatnio zmieniał grób, oraz kiedy kto ostatnio korzystał z mapy.</li>
      </ol>

      <h2>6. Treści dodawane przez użytkowników</h2>
      <ol>
        <li>Odpowiadasz za opisy i zdjęcia, które dodajesz. Nie dodawaj treści bezprawnych, obraźliwych ani naruszających prawa innych osób — w szczególności wizerunku i danych żyjących osób bez ich zgody.</li>
        <li>Treści bezprawne można zgłosić na {{ contact }}, podając link lub opis miejsca w serwisie i uzasadnienie. Usługodawca może usunąć treść bezprawną i poinformuje o tym osobę, która ją dodała.</li>
      </ol>

      <h2>7. Odpowiedzialność</h2>
      <ol>
        <li>Serwis jest udostępniany bezpłatnie, w stanie „takim, jaki jest”. Usługodawca dba o jego działanie, ale nie gwarantuje działania bez przerw i błędów.</li>
        <li>Serwis korzysta z darmowej infrastruktury z dziennymi limitami (np. liczby wysyłanych zdjęć) — po ich wyczerpaniu część funkcji wraca następnego dnia. Ważne zdjęcia zachowaj także w galerii telefonu.</li>
        <li>Postanowienia tego punktu nie ograniczają praw konsumenta wynikających z bezwzględnie obowiązujących przepisów.</li>
      </ol>

      <h2>8. Reklamacje</h2>
      <p>Reklamacje i zgłoszenia błędów wysyłaj na {{ contact }}. Opisz, czego dotyczy zgłoszenie i jak się z Tobą skontaktować. Odpowiedź otrzymasz w ciągu 14 dni.</p>

      <h2>9. Zakończenie korzystania</h2>
      <ol>
        <li>Możesz przestać korzystać z serwisu w każdej chwili i usunąć konto.</li>
        <li>Jeśli serwis miałby zostać zamknięty, Usługodawca poinformuje o tym w aplikacji co najmniej 30 dni wcześniej.</li>
      </ol>

      <h2>10. Dane osobowe</h2>
      <p>Zasady przetwarzania danych opisuje <a routerLink="/prywatnosc">Polityka prywatności</a>.</p>

      <h2>11. Zmiany regulaminu i prawo właściwe</h2>
      <ol>
        <li>Nowa wersja regulaminu ma nowy numer i datę. O zmianach poinformujemy w aplikacji; nowa wersja wiąże od chwili jej zaakceptowania.</li>
        <li>Regulamin podlega prawu polskiemu. Nie wyłącza to ochrony, jaką konsumentowi dają przepisy kraju jego zwykłego pobytu.</li>
      </ol>
    </app-legal-page>
  `,
})
export class TermsPageComponent {
  readonly contact = CONTACT_EMAIL;
}
