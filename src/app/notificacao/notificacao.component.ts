import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { v4 as uuidv4 } from 'uuid';
import { interval, Subscription } from 'rxjs';

interface Notificacao {
  mensagemId: string;
  conteudoMensagem: string;
  status: string;
}

@Component({
  selector: 'app-notificacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notificacao.component.html',
  styleUrls: ['./notificacao.component.css']
})
export class NotificacaoComponent {
  conteudoMensagem = '';
  notificacoes: Notificacao[] = [];
  private pollingSubscription?: Subscription;

  constructor(private http: HttpClient) {
    // Start polling a cada 3 segundos
    this.pollingSubscription = interval(3000).subscribe(() => {
      this.atualizarStatusMensagens();
    });
  }

  enviarNotificacao() {
    if (!this.conteudoMensagem.trim()) {
      alert('Por favor, insira uma mensagem');
      return;
    }

    const mensagemId = uuidv4();
    const payload = {
      mensagemId,
      conteudoMensagem: this.conteudoMensagem.trim()
    };

    this.http.post<any>('http://localhost:3000/api/notificar', payload).subscribe({
      next: () => {
        this.notificacoes.push({
          mensagemId,
          conteudoMensagem: this.conteudoMensagem.trim(),
          status: 'AGUARDANDO PROCESSAMENTO'
        });
        this.conteudoMensagem = '';
      },
      error: (err) => alert('Erro ao enviar notificação: ' + err.message)
    });
  }

  atualizarStatusMensagens() {
    this.notificacoes.forEach(notif => {
      this.http.get<{ mensagemId: string; status: string }>(
        `http://localhost:3000/api/notificacao/status/${notif.mensagemId}`
      ).subscribe({
        next: (res) => {
          notif.status = res.status;
        },
        error: () => {
          // Ignorar erro 404, por exemplo
        }
      });
    });
  }

  ngOnDestroy() {
    this.pollingSubscription?.unsubscribe();
  }
}
