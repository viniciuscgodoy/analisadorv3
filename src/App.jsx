import React, { useState, useCallback, useMemo } from 'react';
import { Upload, BarChart3, TrendingUp, Filter, Calendar, Download, Users, PieChart, Activity, AlertTriangle, Target, Zap, TrendingDown } from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Cell, ComposedChart, Area, AreaChart
} from 'recharts';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import _ from 'lodash';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import BoxPlot from './components/BoxPlot.jsx';
import HeatMap from './components/HeatMap.jsx';
import './App.css';

const AnimalWeightAnalyzer = () => {
  const [data, setData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [selectedPasto, setSelectedPasto] = useState('all');
  const [selectedIdade, setSelectedIdade] = useState('all');
  const [selectedSexo, setSelectedSexo] = useState('all');
  const [loading, setLoading] = useState(false);

  // Definir faixas etárias para o filtro
  const faixasEtarias = [
    { value: 'all', label: 'Todas as idades', min: 0, max: Infinity },
    { value: '0-6', label: '0-6 meses (Bezerros)', min: 0, max: 6 },
    { value: '6-12', label: '6-12 meses (Desmama)', min: 6, max: 12 },
    { value: '12-18', label: '12-18 meses (Recria)', min: 12, max: 18 },
    { value: '18-24', label: '18-24 meses (Engorda)', min: 18, max: 24 },
    { value: '24+', label: '24+ meses (Adultos)', min: 24, max: Infinity }
  ];

  // Cores para gráficos
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const processFile = useCallback((file) => {
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let parsedData;
        
        if (file.name.endsWith('.csv')) {
          const csv = e.target.result;
          parsedData = Papa.parse(csv, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
          }).data;
        } else {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }
        
        // Limpar headers (remover espaços)
        parsedData = parsedData.map(row => {
          const cleanRow = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim().toUpperCase();
            cleanRow[cleanKey] = row[key];
          });
          return cleanRow;
        });
        
        setData(parsedData);
        calculateWeightGain(parsedData);
      } catch (error) {
        alert('Erro ao processar arquivo: ' + error.message);
      }
      setLoading(false);
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    const dateString = dateStr.toString().trim();
    
    if (!isNaN(dateString) && dateString.length > 4) {
      const excelEpoch = new Date(1900, 0, 1);
      const jsDate = new Date(excelEpoch.getTime() + (parseInt(dateString) - 2) * 24 * 60 * 60 * 1000);
      return jsDate;
    }
    
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];
    
    for (let i = 0; i < formats.length; i++) {
      const format = formats[i];
      const match = dateString.match(format);
      if (match) {
        let parsedDate;
        if (i === 1) {
          parsedDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        } else {
          parsedDate = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
        }
        return parsedDate;
      }
    }
    
    const date = new Date(dateString);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1990) {
      return date;
    }
    
    return null;
  };

  const calculateWeightGain = (rawData) => {
    try {
      const animalGroups = _.groupBy(rawData, row => {
        const animal = row.ANIMAL || row.animal || row.Animal;
        return animal ? animal.toString().trim() : 'UNKNOWN';
      });
      
      const results = [];
      
      Object.entries(animalGroups).forEach(([animalName, records]) => {
        if (records.length < 2) return;
        
        const sortedRecords = records
          .map(record => ({
            ...record,
            parsedDate: parseDate(record.DATA || record.DATA_PESAGEM || record.data_pesagem || record.Data_Pesagem)
          }))
          .filter(record => record.parsedDate && !isNaN(record.PESO || record.peso || record.Peso))
          .sort((a, b) => a.parsedDate - b.parsedDate);
        
        if (sortedRecords.length < 2) return;
        
        const gains = [];
        
        for (let i = 1; i < sortedRecords.length; i++) {
          const current = sortedRecords[i];
          const previous = sortedRecords[i - 1];
          
          const peso1 = previous.PESO || previous.peso || previous.Peso;
          const peso2 = current.PESO || current.peso || current.Peso;
          const days = (current.parsedDate - previous.parsedDate) / (1000 * 60 * 60 * 24);
          
          if (days > 0) {
            const weightGain = peso2 - peso1;
            const dailyGain = weightGain / days;
            gains.push(dailyGain);
          }
        }
        
        if (gains.length > 0) {
          const avgDailyGain = _.mean(gains);
          const lastRecord = sortedRecords[sortedRecords.length - 1];
          
          const sexoRaw = lastRecord.SX || lastRecord.sx || lastRecord.Sx || lastRecord.SEXO || lastRecord.sexo || lastRecord.Sexo || 'N/A';
          const sexoNormalizado = sexoRaw.toString().toUpperCase().trim();
          
          results.push({
            animal: animalName,
            local: (lastRecord.LOCAL || lastRecord.local || lastRecord.Local || 'N/A').toString(),
            sexo: sexoNormalizado,
            meses: lastRecord.MESES || lastRecord.meses || lastRecord.Meses || 0,
            ganho_diario: parseFloat(avgDailyGain.toFixed(4)),
            total_pesagens: sortedRecords.length,
            peso_inicial: sortedRecords[0].PESO || sortedRecords[0].peso || sortedRecords[0].Peso,
            peso_final: lastRecord.PESO || lastRecord.peso || lastRecord.Peso,
            ganho_total: (lastRecord.PESO || lastRecord.peso || lastRecord.Peso) - (sortedRecords[0].PESO || sortedRecords[0].peso || sortedRecords[0].Peso),
            periodo_dias: (sortedRecords[sortedRecords.length - 1].parsedDate - sortedRecords[0].parsedDate) / (1000 * 60 * 60 * 24)
          });
        }
      });
      
      setProcessedData(results);
    } catch (error) {
      alert('Erro ao calcular ganho de peso: ' + error.message);
    }
  };

  const getFilteredData = () => {
    if (!processedData) return [];
    
    let filtered = processedData;
    
    if (selectedPasto !== 'all') {
      filtered = filtered.filter(item => item.local === selectedPasto);
    }
    
    if (selectedIdade !== 'all') {
      const faixa = faixasEtarias.find(f => f.value === selectedIdade);
      if (faixa) {
        filtered = filtered.filter(item => {
          const idade = parseInt(item.meses) || 0;
          return idade >= faixa.min && idade < faixa.max;
        });
      }
    }
    
    if (selectedSexo !== 'all') {
      filtered = filtered.filter(item => item.sexo === selectedSexo);
    }
    
    return filtered;
  };

  // ANÁLISES ESTATÍSTICAS AVANÇADAS
  const getStatisticalAnalysis = useMemo(() => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return null;

    const ganhos = filtered.map(item => item.ganho_diario).sort((a, b) => a - b);
    const n = ganhos.length;
    
    // Estatísticas básicas
    const media = _.mean(ganhos);
    const mediana = n % 2 === 0 ? (ganhos[n/2 - 1] + ganhos[n/2]) / 2 : ganhos[Math.floor(n/2)];
    const desvio = Math.sqrt(_.mean(ganhos.map(x => Math.pow(x - media, 2))));
    const coefVariacao = (desvio / media) * 100;
    
    // Quartis
    const q1 = ganhos[Math.floor(n * 0.25)];
    const q3 = ganhos[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    
    // Outliers
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = filtered.filter(item => 
      item.ganho_diario < lowerBound || item.ganho_diario > upperBound
    );
    
    // Distribuição por faixas
    const faixas = [
      { label: 'Muito Baixo (< 0.5)', min: -Infinity, max: 0.5, color: '#ef4444' },
      { label: 'Baixo (0.5 - 0.8)', min: 0.5, max: 0.8, color: '#f59e0b' },
      { label: 'Médio (0.8 - 1.2)', min: 0.8, max: 1.2, color: '#10b981' },
      { label: 'Alto (1.2 - 1.5)', min: 1.2, max: 1.5, color: '#3b82f6' },
      { label: 'Muito Alto (> 1.5)', min: 1.5, max: Infinity, color: '#8b5cf6' }
    ];
    
    const distribuicao = faixas.map(faixa => ({
      ...faixa,
      count: filtered.filter(item => 
        item.ganho_diario >= faixa.min && item.ganho_diario < faixa.max
      ).length
    }));

    return {
      media: parseFloat(media.toFixed(4)),
      mediana: parseFloat(mediana.toFixed(4)),
      desvio: parseFloat(desvio.toFixed(4)),
      coefVariacao: parseFloat(coefVariacao.toFixed(2)),
      q1: parseFloat(q1.toFixed(4)),
      q3: parseFloat(q3.toFixed(4)),
      iqr: parseFloat(iqr.toFixed(4)),
      outliers,
      distribuicao,
      min: Math.min(...ganhos),
      max: Math.max(...ganhos)
    };
  }, [getFilteredData]);

  // Análise comparativa por sexo
  const getComparativeBySex = useMemo(() => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return [];

    const sexos = ['M', 'F'].filter(sexo => 
      filtered.some(item => item.sexo === sexo)
    );

    return sexos.map(sexo => {
      const dados = filtered.filter(item => item.sexo === sexo);
      const ganhos = dados.map(item => item.ganho_diario);
      
      return {
        sexo: sexo === 'M' ? 'Machos' : 'Fêmeas',
        count: dados.length,
        media: parseFloat(_.mean(ganhos).toFixed(4)),
        desvio: parseFloat(Math.sqrt(_.mean(ganhos.map(x => Math.pow(x - _.mean(ganhos), 2)))).toFixed(4)),
        min: Math.min(...ganhos),
        max: Math.max(...ganhos)
      };
    });
  }, [getFilteredData]);

  // Análise por faixa etária
  const getComparativeByAge = useMemo(() => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return [];

    return faixasEtarias.slice(1).map(faixa => {
      const dados = filtered.filter(item => {
        const idade = parseInt(item.meses) || 0;
        return idade >= faixa.min && idade < faixa.max;
      });
      
      if (dados.length === 0) return null;
      
      const ganhos = dados.map(item => item.ganho_diario);
      
      return {
        faixa: faixa.label,
        count: dados.length,
        media: parseFloat(_.mean(ganhos).toFixed(4)),
        desvio: parseFloat(Math.sqrt(_.mean(ganhos.map(x => Math.pow(x - _.mean(ganhos), 2)))).toFixed(4))
      };
    }).filter(Boolean);
  }, [getFilteredData]);

  // Dados para Boxplot
  const getBoxplotData = useMemo(() => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return [];

    const sexos = ['M', 'F'].filter(sexo => 
      filtered.some(item => item.sexo === sexo)
    );

    return sexos.map(sexo => ({
      name: sexo === 'M' ? 'Machos' : 'Fêmeas',
      values: filtered.filter(item => item.sexo === sexo).map(item => item.ganho_diario),
      color: sexo === 'M' ? '#3b82f6' : '#ec4899'
    }));
  }, [getFilteredData]);

  // Dados para Heatmap (Local vs Faixa Etária)
  const getHeatmapData = useMemo(() => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return [];

    const locais = [...new Set(filtered.map(item => item.local))];
    const faixasUsadas = faixasEtarias.slice(1, -1); // Excluir 'all' e '24+'
    
    const heatmapData = [];
    
    locais.forEach(local => {
      faixasUsadas.forEach(faixa => {
        const animais = filtered.filter(item => {
          const idade = parseInt(item.meses) || 0;
          return item.local === local && idade >= faixa.min && idade < faixa.max;
        });
        
        if (animais.length > 0) {
          const mediaLocal = _.mean(animais.map(item => item.ganho_diario));
          heatmapData.push({
            x: local,
            y: faixa.label.split(' ')[0], // Pegar apenas a faixa (ex: "0-6")
            value: mediaLocal
          });
        }
      });
    });
    
    return heatmapData;
  }, [getFilteredData]);

  // Indicadores de Performance
  const getPerformanceIndicators = useMemo(() => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return null;

    const stats = getStatisticalAnalysis;
    if (!stats) return null;

    const excelentes = filtered.filter(item => item.ganho_diario > stats.q3).length;
    const bons = filtered.filter(item => item.ganho_diario >= stats.media && item.ganho_diario <= stats.q3).length;
    const regulares = filtered.filter(item => item.ganho_diario >= stats.q1 && item.ganho_diario < stats.media).length;
    const ruins = filtered.filter(item => item.ganho_diario < stats.q1).length;

    return {
      excelentes: { count: excelentes, percent: (excelentes / filtered.length * 100).toFixed(1) },
      bons: { count: bons, percent: (bons / filtered.length * 100).toFixed(1) },
      regulares: { count: regulares, percent: (regulares / filtered.length * 100).toFixed(1) },
      ruins: { count: ruins, percent: (ruins / filtered.length * 100).toFixed(1) }
    };
  }, [getFilteredData, getStatisticalAnalysis]);

  const getScatterData = () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return { data: [], media: 0 };
    
    const media = _.mean(filtered.map(item => item.ganho_diario));
    
    const scatterData = filtered.map((item, index) => ({
      x: index + 1,
      y: item.ganho_diario,
      animal: item.animal,
      local: item.local,
      sexo: item.sexo,
      meses: item.meses,
      acima_media: item.ganho_diario >= media
    }));
    
    return { data: scatterData, media: parseFloat(media.toFixed(4)) };
  };

  const exportToCSV = () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }

    const csvData = filtered.map(item => ({
      'Animal': item.animal,
      'Pasto': item.local,
      'Sexo': item.sexo,
      'Idade (meses)': item.meses,
      'Ganho Diário (kg/dia)': item.ganho_diario,
      'Peso Inicial (kg)': item.peso_inicial,
      'Peso Final (kg)': item.peso_final,
      'Ganho Total (kg)': item.ganho_total,
      'Período (dias)': Math.round(item.periodo_dias),
      'Total de Pesagens': item.total_pesagens,
      'Status': item.ganho_diario >= getScatterData().media ? 'Acima da Média' : 'Abaixo da Média'
    }));

    const csv = Papa.unparse(csvData);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    let fileName = 'analise_peso_animais';
    if (selectedPasto !== 'all') fileName += `_${selectedPasto}`;
    if (selectedIdade !== 'all') fileName += `_${selectedIdade}meses`;
    if (selectedSexo !== 'all') fileName += `_${selectedSexo}`;
    fileName += '.csv';
    
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const uniqueLocals = processedData ? [...new Set(processedData.map(item => item.local))] : [];
  const uniqueSexos = processedData ? [...new Set(processedData.map(item => item.sexo))].filter(sexo => sexo !== 'N/A') : [];
  const { data: scatterData, media } = getScatterData();
  const filteredData = getFilteredData();
  const stats = getStatisticalAnalysis;
  const comparativeSex = getComparativeBySex;
  const comparativeAge = getComparativeByAge;
  const boxplotData = getBoxplotData;
  const heatmapData = getHeatmapData;
  const performanceIndicators = getPerformanceIndicators;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold">{`Animal: ${data.animal}`}</p>
          <p>{`Local: ${data.local}`}</p>
          <p>{`Sexo: ${data.sexo}`}</p>
          <p>{`Idade: ${data.meses} meses`}</p>
          <p>{`Ganho diário: ${data.y} kg/dia`}</p>
          <p className={data.acima_media ? "text-green-600" : "text-red-600"}>
            {data.acima_media ? "Acima da média" : "Abaixo da média"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="text-green-600" />
            Analisador de Ganho de Peso dos Animais - Versão Profissional
          </CardTitle>
          <CardDescription>
            Sistema completo de análise zootécnica com estatísticas avançadas, gráficos comparativos, boxplots, heatmaps e insights detalhados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-xl font-medium text-gray-600 mb-2">
                Arraste e solte sua planilha aqui
              </p>
              <p className="text-gray-500 mb-4">ou</p>
              <Button asChild>
                <label className="cursor-pointer">
                  <Upload size={20} className="mr-2" />
                  Selecionar arquivo
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Formatos suportados: CSV, Excel (.xlsx, .xls)
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Processando dados...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {processedData && (
        <div className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="text-gray-600" />
                Filtros Avançados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrar por pasto:
                  </label>
                  <Select value={selectedPasto} onValueChange={setSelectedPasto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pasto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os pastos</SelectItem>
                      {uniqueLocals.map(local => (
                        <SelectItem key={local} value={local}>{local}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Filtrar por idade:
                  </label>
                  <Select value={selectedIdade} onValueChange={setSelectedIdade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma faixa etária" />
                    </SelectTrigger>
                    <SelectContent>
                      {faixasEtarias.map(faixa => (
                        <SelectItem key={faixa.value} value={faixa.value}>
                          {faixa.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="inline w-4 h-4 mr-1" />
                    Filtrar por sexo:
                  </label>
                  <Select value={selectedSexo} onValueChange={setSelectedSexo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os sexos</SelectItem>
                      {uniqueSexos.map(sexo => (
                        <SelectItem key={sexo} value={sexo}>
                          {sexo === 'M' ? 'Macho' : sexo === 'F' ? 'Fêmea' : sexo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">
                  {selectedPasto !== 'all' && (
                    <Badge variant="secondary">
                      Pasto: {selectedPasto}
                    </Badge>
                  )}
                  {selectedIdade !== 'all' && (
                    <Badge variant="secondary">
                      Idade: {faixasEtarias.find(f => f.value === selectedIdade)?.label}
                    </Badge>
                  )}
                  {selectedSexo !== 'all' && (
                    <Badge variant="secondary">
                      Sexo: {selectedSexo === 'M' ? 'Macho' : selectedSexo === 'F' ? 'Fêmea' : selectedSexo}
                    </Badge>
                  )}
                </div>
                
                <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
                  <Download size={16} />
                  Exportar CSV ({filteredData.length} animais)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alertas de Outliers */}
          {stats && stats.outliers.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> {stats.outliers.length} animal(is) com performance atípica detectado(s): {' '}
                {stats.outliers.slice(0, 3).map(animal => animal.animal).join(', ')}
                {stats.outliers.length > 3 && ` e mais ${stats.outliers.length - 3}`}
              </AlertDescription>
            </Alert>
          )}

          {/* Dashboard com Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
              <TabsTrigger value="comparisons">Comparações</TabsTrigger>
              <TabsTrigger value="advanced">Avançado</TabsTrigger>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
            </TabsList>

            {/* Tab: Visão Geral */}
            <TabsContent value="overview" className="space-y-6">
              {/* KPIs Principais */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-800">Total</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{filteredData.length}</p>
                    <p className="text-xs text-gray-500">animais</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-800">Média</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{media}</p>
                    <p className="text-xs text-gray-500">kg/dia</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-800">Acima</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      {filteredData.filter(item => item.ganho_diario >= media).length}
                    </p>
                    <p className="text-xs text-gray-500">da média</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold text-red-800">Abaixo</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {filteredData.filter(item => item.ganho_diario < media).length}
                    </p>
                    <p className="text-xs text-gray-500">da média</p>
                  </CardContent>
                </Card>
                {stats && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold text-orange-800">Outliers</h3>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">{stats.outliers.length}</p>
                      <p className="text-xs text-gray-500">atípicos</p>
                    </CardContent>
                  </Card>
                )}
                {stats && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-semibold text-indigo-800">CV</h3>
                      </div>
                      <p className="text-2xl font-bold text-indigo-600">{stats.coefVariacao}%</p>
                      <p className="text-xs text-gray-500">variação</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Indicadores de Performance */}
              {performanceIndicators && (
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{performanceIndicators.excelentes.count}</div>
                        <div className="text-sm text-gray-600">Excelentes ({performanceIndicators.excelentes.percent}%)</div>
                        <Progress value={parseFloat(performanceIndicators.excelentes.percent)} className="mt-2" />
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{performanceIndicators.bons.count}</div>
                        <div className="text-sm text-gray-600">Bons ({performanceIndicators.bons.percent}%)</div>
                        <Progress value={parseFloat(performanceIndicators.bons.percent)} className="mt-2" />
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{performanceIndicators.regulares.count}</div>
                        <div className="text-sm text-gray-600">Regulares ({performanceIndicators.regulares.percent}%)</div>
                        <Progress value={parseFloat(performanceIndicators.regulares.percent)} className="mt-2" />
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{performanceIndicators.ruins.count}</div>
                        <div className="text-sm text-gray-600">Ruins ({performanceIndicators.ruins.percent}%)</div>
                        <Progress value={parseFloat(performanceIndicators.ruins.percent)} className="mt-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gráfico de Dispersão Principal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="text-blue-600" />
                    Ganho de Peso Diário por Animal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Animal" 
                        domain={[0, scatterData.length + 1]}
                        label={{ value: 'Animais (ordem)', position: 'insideBottom', offset: -10 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Ganho"
                        label={{ value: 'Ganho diário (kg/dia)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      
                      <ReferenceLine 
                        y={media} 
                        stroke="#666" 
                        strokeDasharray="5 5" 
                        label={{ value: `Média: ${media} kg/dia`, position: 'topRight' }}
                      />
                      
                      {stats && (
                        <>
                          <ReferenceLine 
                            y={stats.q1} 
                            stroke="#f59e0b" 
                            strokeDasharray="2 2" 
                            label={{ value: `Q1: ${stats.q1}`, position: 'topLeft' }}
                          />
                          <ReferenceLine 
                            y={stats.q3} 
                            stroke="#f59e0b" 
                            strokeDasharray="2 2" 
                            label={{ value: `Q3: ${stats.q3}`, position: 'topLeft' }}
                          />
                        </>
                      )}
                      
                      <Scatter
                        name="Acima da média"
                        data={scatterData.filter(item => item.acima_media)}
                        fill="#10b981"
                      />
                      
                      <Scatter
                        name="Abaixo da média"
                        data={scatterData.filter(item => !item.acima_media)}
                        fill="#ef4444"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Estatísticas */}
            <TabsContent value="statistics" className="space-y-6">
              {stats && (
                <>
                  {/* Estatísticas Descritivas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Medidas de Tendência Central</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Média:</span>
                          <span className="font-semibold">{stats.media} kg/dia</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mediana:</span>
                          <span className="font-semibold">{stats.mediana} kg/dia</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mínimo:</span>
                          <span className="font-semibold">{stats.min.toFixed(4)} kg/dia</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Máximo:</span>
                          <span className="font-semibold">{stats.max.toFixed(4)} kg/dia</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Medidas de Dispersão</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Desvio Padrão:</span>
                          <span className="font-semibold">{stats.desvio} kg/dia</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Coef. Variação:</span>
                          <span className="font-semibold">{stats.coefVariacao}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amplitude IQR:</span>
                          <span className="font-semibold">{stats.iqr} kg/dia</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Outliers:</span>
                          <span className="font-semibold text-orange-600">{stats.outliers.length}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quartis</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Q1 (25%):</span>
                          <span className="font-semibold">{stats.q1} kg/dia</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Q2 (50%):</span>
                          <span className="font-semibold">{stats.mediana} kg/dia</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Q3 (75%):</span>
                          <span className="font-semibold">{stats.q3} kg/dia</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          50% dos animais têm ganho entre {stats.q1} e {stats.q3} kg/dia
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Distribuição de Frequência */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuição de Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.distribuicao}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Gráfico de Pizza da Distribuição */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuição Percentual de Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Tooltip />
                          <Legend />
                          <RechartsPieChart
                            data={stats.distribuicao.filter(d => d.count > 0)}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="count"
                            label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(1)}%`}
                          >
                            {stats.distribuicao.filter(d => d.count > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </RechartsPieChart>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Tab: Comparações */}
            <TabsContent value="comparisons" className="space-y-6">
              {/* Comparação por Sexo */}
              {comparativeSex.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comparação por Sexo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparativeSex}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="sexo" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="media" fill="#3b82f6" name="Média (kg/dia)" />
                        <Bar dataKey="count" fill="#10b981" name="Quantidade" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Comparação por Faixa Etária */}
              {comparativeAge.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comparação por Faixa Etária</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparativeAge}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="faixa" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="media" fill="#8b5cf6" name="Média (kg/dia)" />
                        <Bar dataKey="count" fill="#f59e0b" name="Quantidade" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tabela Comparativa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {comparativeSex.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Estatísticas por Sexo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">Sexo</th>
                              <th className="px-4 py-2 text-left">Quantidade</th>
                              <th className="px-4 py-2 text-left">Média</th>
                              <th className="px-4 py-2 text-left">Desvio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparativeSex.map((item, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 font-medium">{item.sexo}</td>
                                <td className="px-4 py-2">{item.count}</td>
                                <td className="px-4 py-2">{item.media} kg/dia</td>
                                <td className="px-4 py-2">{item.desvio} kg/dia</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {comparativeAge.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Estatísticas por Idade</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">Faixa Etária</th>
                              <th className="px-4 py-2 text-left">Quantidade</th>
                              <th className="px-4 py-2 text-left">Média</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparativeAge.map((item, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 font-medium">{item.faixa}</td>
                                <td className="px-4 py-2">{item.count}</td>
                                <td className="px-4 py-2">{item.media} kg/dia</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Tab: Avançado */}
            <TabsContent value="advanced" className="space-y-6">
              {/* Boxplot por Sexo */}
              {boxplotData.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Boxplot - Distribuição por Sexo</CardTitle>
                    <CardDescription>
                      Visualização da distribuição, quartis e outliers por sexo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <BoxPlot data={boxplotData} width={500} height={350} />
                  </CardContent>
                </Card>
              )}

              {/* Heatmap Local vs Idade */}
              {heatmapData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Heatmap - Performance por Local e Faixa Etária</CardTitle>
                    <CardDescription>
                      Média de ganho de peso por local e faixa etária (cores mais escuras = maior ganho)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <HeatMap data={heatmapData} width={700} height={400} />
                  </CardContent>
                </Card>
              )}

              {/* Análise de Correlação */}
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Correlação</CardTitle>
                  <CardDescription>
                    Relação entre idade e ganho de peso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="meses" name="Idade (meses)" />
                      <YAxis dataKey="ganho_diario" name="Ganho (kg/dia)" />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'meses' ? `${value} meses` : `${value} kg/dia`,
                          name === 'meses' ? 'Idade' : 'Ganho Diário'
                        ]}
                      />
                      <Scatter dataKey="ganho_diario" fill="#3b82f6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Detalhes */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes por Animal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Animal</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Pasto</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Sexo</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Idade (meses)</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Ganho Diário</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Ganho Total</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Período (dias)</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((item, index) => {
                          const isOutlier = stats && stats.outliers.some(outlier => outlier.animal === item.animal);
                          return (
                            <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isOutlier ? 'border-l-4 border-orange-400' : ''}`}>
                              <td className="px-4 py-2 font-medium">{item.animal}</td>
                              <td className="px-4 py-2">{item.local}</td>
                              <td className="px-4 py-2">
                                <Badge variant={item.sexo === 'M' ? 'default' : item.sexo === 'F' ? 'secondary' : 'outline'}>
                                  {item.sexo === 'M' ? 'Macho' : item.sexo === 'F' ? 'Fêmea' : item.sexo}
                                </Badge>
                              </td>
                              <td className="px-4 py-2">{item.meses}</td>
                              <td className={`px-4 py-2 font-semibold ${item.ganho_diario >= media ? 'text-green-600' : 'text-red-600'}`}>
                                {item.ganho_diario} kg/dia
                                {isOutlier && <span className="ml-1 text-orange-500">⚠️</span>}
                              </td>
                              <td className="px-4 py-2">{item.ganho_total?.toFixed(2)} kg</td>
                              <td className="px-4 py-2">{Math.round(item.periodo_dias || 0)} dias</td>
                              <td className="px-4 py-2">
                                <Badge variant={item.ganho_diario >= media ? 'default' : 'destructive'}>
                                  {item.ganho_diario >= media ? 'Acima' : 'Abaixo'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default AnimalWeightAnalyzer;

