// Importando as dependências necessárias
const mqtt = require('mqtt');
const express = require('express');
const fs = require('fs');
const qrcode = require('qrcode');
const os = require('os'); // Novo: Importando o módulo os para obter o IP local

// Função para obter o IP local
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const ip = getLocalIP();

// Definindo as informações do broker MQTT
const clienteID_broker = 'nodejs';
const host_broker = 'nodejs.cloud.shiftr.io';
const port_broker = 1883;
const username_broker = 'nodejs';
const pass_broker = 'pgdFsVjZhZzXnAn4';

// Criando o app express
const app = express();

app.use(express.json());

// Armazenar dados recebidos do broker
let data = {
    volt2: '--',
    current_mA2: '--',
    power2: '--',
    volt3: '--',
    current_mA3: '--',
    power3: '--'
};

// Servindo a página HTML estática
app.get('/', (req, res) => {
    fs.readFile('index.html', 'utf-8', (err, dataContent) => {
        if (err) {
            res.status(500).send("Erro ao abrir arquivo");
            return;
        }
        res.send(dataContent);
    });
});

// Rota para obter os dados do sensor
app.get('/api/data', (req, res) => {
    res.json(data);
});

// Novo: Rota para gerar o QR code
app.get('/qrcode', (req, res) => {
    const url = `http://${ip}:3000`;
    qrcode.toBuffer(url, (err, buffer) => {
        if (err) {
            console.error('Erro ao gerar QR Code:', err);
            res.status(500).send('Erro ao gerar QR Code');
            return;
        }
        res.type('png');
        res.send(buffer);
    });
});

// Conectando ao broker MQTT (shiftr.io)
const brokerUrl = `mqtt://${host_broker}:${port_broker}`;
const client = mqtt.connect(brokerUrl, {
    clientId: clienteID_broker,
    username: username_broker,
    password: pass_broker
});

// Tópicos que estamos assinando no broker
const topics = ['canal2/voltagem', 'canal2/corrente', 'canal2/potencia', 'canal3/voltagem', 'canal3/corrente', 'canal3/potencia'];

// Evento de conexão com o broker MQTT
client.on('connect', () => {
    console.log('Conectado ao broker MQTT!');
    client.subscribe(topics, (err) => {
        if (err) {
            console.error('Erro ao se inscrever nos tópicos:', err);
        } else {
            console.log('Inscrito nos tópicos:', topics);
        }
    });
});

// Evento de recebimento de mensagem MQTT
client.on('message', (topic, message) => {
    let value = parseFloat(message.toString());

    // Mapeando os tópicos para as colunas correspondentes
    const mapping = {
        'canal2/voltagem': 'volt2',
        'canal2/corrente': 'current_mA2',
        'canal2/potencia': 'power2',
        'canal3/voltagem': 'volt3',
        'canal3/corrente': 'current_mA3',
        'canal3/potencia': 'power3'
    };

    // Atualiza os dados recebidos
    if (mapping[topic]) {
        data[mapping[topic]] = value.toFixed(2);
        console.log(`Dados atualizados - ${mapping[topic]}: ${data[mapping[topic]]}`);
    }
});

// Evento de erro MQTT
client.on('error', (error) => {
    console.error('Erro de conexão MQTT:', error);
});

// Iniciando o servidor
app.listen(3001, ip, () => {
    console.log(`Servidor ativo na porta http://${ip}:3001`);
});
