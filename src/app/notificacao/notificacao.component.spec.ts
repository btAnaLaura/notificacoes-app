import { NotificacaoComponent } from './notificacao.component';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));


describe('NotificacaoComponent - Funcional', () => {
  let component: NotificacaoComponent;
  let httpClientMock: jest.Mocked<HttpClient>;

  beforeEach(() => {
    httpClientMock = {
      post: jest.fn(),
      get: jest.fn(),
    } as any;
    component = new NotificacaoComponent(httpClientMock);
    global.alert = jest.fn();
  });

  describe('enviarNotificacao', () => {
    it('deve alertar se conteudoMensagem estiver vazio', () => {
      component.conteudoMensagem = '   ';
      component.enviarNotificacao();
      expect(global.alert).toHaveBeenCalledWith('Por favor, insira uma mensagem');
      expect(httpClientMock.post).not.toHaveBeenCalled();
    });

    it('deve enviar notificação e limpar conteudoMensagem', () => {
      (uuidv4 as jest.Mock).mockReturnValue('id-mock');
      component.conteudoMensagem = 'Mensagem funcional';
      httpClientMock.post.mockReturnValue(of({}));

      component.enviarNotificacao();

      expect(httpClientMock.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/notificar',
        { mensagemId: 'id-mock', conteudoMensagem: 'Mensagem funcional' }
      );
      expect(component.notificacoes.length).toBe(1);
      expect(component.notificacoes[0]).toEqual({
        mensagemId: 'id-mock',
        conteudoMensagem: 'Mensagem funcional',
        status: 'AGUARDANDO PROCESSAMENTO'
      });
      expect(component.conteudoMensagem).toBe('');
    });

    it('deve alertar erro se POST falhar', () => {
      (uuidv4 as jest.Mock).mockReturnValue('id-erro');
      component.conteudoMensagem = 'Mensagem erro';
      httpClientMock.post.mockReturnValue(throwError(() => ({ message: 'Falha no envio' })));

      component.enviarNotificacao();

      expect(global.alert).toHaveBeenCalledWith('Erro ao enviar notificação: Falha no envio');
    });
  });

  describe('atualizarStatusMensagens', () => {
    it('deve atualizar status das notificações', () => {
      component.notificacoes = [
        { mensagemId: 'id1', conteudoMensagem: 'msg1', status: 'AGUARDANDO PROCESSAMENTO' },
        { mensagemId: 'id2', conteudoMensagem: 'msg2', status: 'AGUARDANDO PROCESSAMENTO' }
      ];

      httpClientMock.get
        .mockReturnValueOnce(of({ mensagemId: 'id1', status: 'PROCESSADO_SUCESSO' }))
        .mockReturnValueOnce(of({ mensagemId: 'id2', status: 'FALHA_PROCESSAMENTO' }));

      component.atualizarStatusMensagens();

      expect(httpClientMock.get).toHaveBeenCalledWith('http://localhost:3000/api/notificacao/status/id1');
      expect(httpClientMock.get).toHaveBeenCalledWith('http://localhost:3000/api/notificacao/status/id2');
      expect(component.notificacoes[0].status).toBe('PROCESSADO_SUCESSO');
      expect(component.notificacoes[1].status).toBe('FALHA_PROCESSAMENTO');
    });

    it('deve ignorar erro ao atualizar status', () => {
      component.notificacoes = [
        { mensagemId: 'id1', conteudoMensagem: 'msg1', status: 'AGUARDANDO PROCESSAMENTO' }
      ];
      httpClientMock.get.mockReturnValueOnce(throwError(() => ({ status: 404 })));

      expect(() => component.atualizarStatusMensagens()).not.toThrow();
      expect(component.notificacoes[0].status).toBe('AGUARDANDO PROCESSAMENTO');
    });
  });
});
