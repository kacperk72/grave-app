import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LegalPageComponent } from './legal-page.component';
import { CONTACT_EMAIL } from '../../shared/legal';

@Component({
  selector: 'app-privacy-page',
  imports: [LegalPageComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-page title="Polityka prywatności">
      <h2>1. Administrator danych</h2>
      <p>Administratorem Twoich danych osobowych jest Kacper Kubit. W sprawach danych pisz na <a [href]="'mailto:' + contact">{{ contact }}</a>.</p>

      <h2>2. Jakie dane i kiedy</h2>
      <p><strong>Aplikacja bez konta i bez mapy rodzinnej.</strong> Groby, zdjęcia i ustawienia zostają w pamięci Twojego urządzenia — nie wysyłamy ich na serwer. Przy wejściu na stronę i wyświetlaniu mapy Twój adres IP widzą technicznie serwer strony i dostawcy kafelków mapy (punkt 4).</p>
      <p><strong>Mapa rodzinna.</strong> Na serwerze zapisujemy: Twój podpis w mapie (imię i kolor), groby mapy (lokalizacja GPS, cmentarz, dane osób pochowanych, opisy, terminy opłat), zdjęcia, informację, kto ostatnio zmieniał grób, kiedy ostatnio korzystałeś z mapy (widzą to jej członkowie), oraz wersję, datę i godzinę zaakceptowania regulaminu.</p>
      <p><strong>Konto.</strong> Dodatkowo: adres e-mail, hasło w postaci skrótu (nie znamy Twojego hasła), sesje zalogowanych urządzeń, skrót adresu IP przy prośbie o kod z maila (ochrona przed nadużyciami) oraz datę i wersję zaakceptowanego regulaminu.</p>
      <p>Dane osób zmarłych nie są danymi osobowymi w rozumieniu RODO, ale opisy i zdjęcia mogą dotyczyć żyjących osób — dodawaj je z rozwagą.</p>

      <h2>3. Cele i podstawy prawne</h2>
      <ul>
        <li>świadczenie usługi — prowadzenie konta, map rodzinnych i synchronizacji (art. 6 ust. 1 lit. b RODO),</li>
        <li>bezpieczeństwo — limity prób logowania i próśb o kod, skrót adresu IP, dzienniki serwera (art. 6 ust. 1 lit. f RODO; uzasadniony interes to ochrona kont i serwisu przed nadużyciami),</li>
        <li>obsługa zgłoszeń wysłanych na adres kontaktowy (art. 6 ust. 1 lit. f RODO).</li>
      </ul>
      <p>Podanie danych jest dobrowolne. Bez adresu e-mail nie założysz konta, a bez podpisu nie dołączysz do mapy rodzinnej — z aplikacji w telefonie możesz korzystać bez nich.</p>

      <h2>4. Komu przekazujemy dane</h2>
      <ul>
        <li>członkom tej samej mapy rodzinnej — widzą jej groby, zdjęcia i podpisy osób,</li>
        <li>Cloudflare, Inc. — serwer aplikacji, baza danych i zdjęcia,</li>
        <li>Hostinger — serwer strony znajdzgroby.pl,</li>
        <li>Resend — wysyłka wiadomości z kodem (tylko adres e-mail i treść wiadomości),</li>
        <li>OpenStreetMap Foundation i Esri — kafelki mapy (adres IP przy pobieraniu kafelków).</li>
      </ul>
      <p>Cloudflare, Resend i Esri to firmy z USA. Dane mogą być przekazywane poza Europejski Obszar Gospodarczy na podstawie standardowych klauzul umownych zatwierdzonych przez Komisję Europejską lub programu EU-U.S. Data Privacy Framework. OpenStreetMap Foundation działa w Wielkiej Brytanii, dla której Komisja wydała decyzję stwierdzającą odpowiedni stopień ochrony.</p>

      <h2>5. Jak długo przechowujemy dane</h2>
      <table>
        <tr><th>Dane</th><th>Okres</th></tr>
        <tr><td>konto, e-mail, skrót hasła, wersja oraz data i godzina zgody</td><td>do usunięcia konta</td></tr>
        <tr><td>sesje urządzeń</td><td>do wylogowania albo 365 dni bez korzystania z aplikacji</td></tr>
        <tr><td>kody z maila i skrót adresu IP</td><td>do 48 godzin (codzienne sprzątanie kasuje kody starsze niż doba)</td></tr>
        <tr><td>dane w mapie rodzinnej</td><td>do usunięcia grobu, mapy albo konta; po usunięciu konta Twój podpis w mapach zastępujemy napisem „Usunięte konto”</td></tr>
        <tr><td>zdjęcia usuniętych map</td><td>zwykle do kilku dni po usunięciu (darmowa infrastruktura pozwala kasować ograniczoną liczbę plików dziennie)</td></tr>
        <tr><td>dzienniki serwera aplikacji</td><td>do 3 dni</td></tr>
        <tr><td>wiadomości wysłane na adres kontaktowy</td><td>do zakończenia sprawy, najdłużej rok</td></tr>
      </table>

      <h2>6. Twoje prawa</h2>
      <p>Masz prawo do dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia oraz sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie. Konto usuniesz sam w Ustawieniach („Usuń konto”); w pozostałych sprawach napisz na {{ contact }}. Masz też prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</p>

      <h2>7. Pamięć urządzenia, cookies, analityka</h2>
      <p>Aplikacja zapisuje dane w pamięci Twojej przeglądarki (IndexedDB, localStorage) — groby, ustawienia, sesję konta i informację o zaakceptowanym regulaminie. To niezbędne do działania aplikacji. Nie używamy cookies śledzących, narzędzi analitycznych ani reklam i nie profilujemy użytkowników.</p>

      <h2>8. Zmiany polityki</h2>
      <p>Każda zmiana polityki ma nowy numer wersji i datę. Zobacz też <a routerLink="/regulamin">Regulamin</a>.</p>
    </app-legal-page>
  `,
})
export class PrivacyPageComponent {
  readonly contact = CONTACT_EMAIL;
}
