import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificacaoComponent } from './notificacao.component';
import { FormsModule } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';

// Mock do uuid para controlar o valor do id
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('NotificacaoComponent', () => {
  let component: NotificacaoComponent;
  let fixture: ComponentFixture<NotificacaoComponent>;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NotificacaoComponent, HttpClientTestingModule, FormsModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificacaoComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    // Mock do alert
    global.alert = jest.fn();
  });

  afterEach(() => {
    httpMock.verify(); // Verifica que não há requisições pendentes
    jest.clearAllMocks();
  });

  it('deve alertar se conteudoMensagem estiver vazio', () => {
    component.conteudoMensagem = '   ';
    component.enviarNotificacao();

    expect(global.alert).toHaveBeenCalledWith('Por favor, insira uma mensagem');
  });

  it('deve gerar mensagemId, enviar POST e adicionar notificação na lista com status inicial', () => {
    component.conteudoMensagem = 'Mensagem teste';
    (uuidv4 as jest.Mock).mockReturnValue('mocked-uuid');

    component.enviarNotificacao();

    // Espera a requisição POST ser feita
    const req = httpMock.expectOne('http://localhost:3000/api/notificar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      mensagemId: 'mocked-uuid',
      conteudoMensagem: 'Mensagem teste'
    });

    // Simula resposta bem-sucedida
    req.flush({ mensagemId: 'mocked-uuid', status: 'Recebido e publicado para processamento' });

    // Verifica se a notificação foi adicionada à lista com status inicial
    expect(component.notificacoes.length).toBe(1);
    expect(component.notificacoes[0]).toEqual({
      mensagemId: 'mocked-uuid',
      conteudoMensagem: 'Mensagem teste',
      status: 'AGUARDANDO PROCESSAMENTO'
    });

    // ConteudoMensagem deve ser limpo
    expect(component.conteudoMensagem).toBe('');
  });

  it('deve alertar erro se requisição POST falhar', () => {
    component.conteudoMensagem = 'Mensagem erro';
    (uuidv4 as jest.Mock).mockReturnValue('error-uuid');

    component.enviarNotificacao();

    const req = httpMock.expectOne('http://localhost:3000/api/notificar');
    expect(req.request.method).toBe('POST');

    req.flush({ message: 'Erro teste' }, { status: 500, statusText: 'Server Error' });

    expect(global.alert).toHaveBeenCalledWith('Erro ao enviar notificação: Http failure response for http://localhost:3000/api/notificar: 500 Server Error');
  });

  it('deve atualizar status das notificações via polling', () => {
    component.notificacoes = [
      { mensagemId: 'id1', conteudoMensagem: 'msg1', status: 'AGUARDANDO PROCESSAMENTO' },
      { mensagemId: 'id2', conteudoMensagem: 'msg2', status: 'AGUARDANDO PROCESSAMENTO' }
    ];

    component.atualizarStatusMensagens();

    // Deve ter feito duas requisições GET, uma para cada mensagemId
    const req1 = httpMock.expectOne('http://localhost:3000/api/notificacao/status/id1');
    const req2 = httpMock.expectOne('http://localhost:3000/api/notificacao/status/id2');

    expect(req1.request.method).toBe('GET');
    expect(req2.request.method).toBe('GET');

    // Simula respostas de status
    req1.flush({ mensagemId: 'id1', status: 'PROCESSADO_SUCESSO' });
    req2.flush({ mensagemId: 'id2', status: 'FALHA_PROCESSAMENTO' });

    // Verifica se os status foram atualizados no array
    expect(component.notificacoes[0].status).toBe('PROCESSADO_SUCESSO');
    expect(component.notificacoes[1].status).toBe('FALHA_PROCESSAMENTO');
  });
});
