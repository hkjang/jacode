'use client';

import { Info, HelpCircle, Activity, MessageSquare, Code, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

export function RoutingUsageGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          도움말 & 가이드
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>라우팅 정책 시스템 가이드</DialogTitle>
          <DialogDescription>
            AI 모델이 언제, 어떻게, 왜 선택되는지 이해하고 정책을 최적화하세요.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="integration" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="integration">작동 위치 (Where)</TabsTrigger>
            <TabsTrigger value="logic">선택 로직 (How)</TabsTrigger>
            <TabsTrigger value="tips">최적화 팁</TabsTrigger>
          </TabsList>

          <TabsContent value="integration" className="space-y-4 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">정책이 적용되는 순간</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <MessageSquare className="h-5 w-5" />
                      <h4 className="font-semibold">AI 채팅</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      사용자가 일반적인 질문을 하거나 대화를 나눌 때. 
                      보통 '비용'과 '가용성'이 중요합니다.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2 text-blue-500">
                      <Code className="h-5 w-5" />
                      <h4 className="font-semibold">코드 생성</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      "코드 작성해줘"와 같은 요청 시.
                      정확도가 중요하므로 '성능(Performance)' 가중치가 높아야 합니다. 
                      또는 'Coding' 전용 모델을 선호도로 설정하세요.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2 text-purple-500">
                      <Zap className="h-5 w-5" />
                      <h4 className="font-semibold">자동 리팩토링/Fix</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      백그라운드에서 실행되는 유지보수 작업.
                      대량 처리가 필요할 수 있어 '비용' 효율성이 중요할 수 있습니다.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logic" className="space-y-4 py-4">
             <div className="space-y-4 text-sm">
              <div className="p-4 bg-muted rounded-lg border">
                <h4 className="font-semibold mb-2">가중치(Weights)의 의미</h4>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <span className="font-bold min-w-[100px]">비용 (Cost):</span>
                    <span>높을수록 <span className="text-green-600 font-medium">저렴한</span> 모델을 선택합니다. (토큰 당 비용 기준)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold min-w-[100px]">성능 (Perf):</span>
                    <span>높을수록 <span className="text-blue-600 font-medium">빠르고 똑똑한</span> 모델을 선택합니다. (응답 속도 + 모델 등급)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold min-w-[100px]">가용성 (Avail):</span>
                    <span>높을수록 <span className="text-orange-600 font-medium">안정적인</span> 서버를 선택합니다. (에러율이 낮은 서버)</span>
                  </li>
                </ul>
              </div>

               <div className="p-4 bg-muted rounded-lg border">
                <h4 className="font-semibold mb-2">점수 계산 방식</h4>
                <div className="font-mono text-xs bg-black/5 p-2 rounded">
                  Total Score = (CostScore * CostWeight) + (PerfScore * PerfWeight) + (AvailScore * AvailWeight)
                </div>
                <p className="mt-2 text-muted-foreground">
                  * 추가로 <strong>'모델 선호도'</strong> 설정에 맞는 모델은 최종 점수에 보너스를 받습니다.
                </p>
              </div>
            </div>
          </TabsContent>

           <TabsContent value="tips" className="space-y-4 py-4">
             <div className="space-y-4 text-sm">
               <ul className="list-disc list-inside space-y-3">
                 <li>
                   <strong>우선순위(Priority) 활용:</strong> 여러 정책이 'Active' 상태일 수 있습니다. 가장 높은 우선순위 숫자를 가진 정책 하나만 적용됩니다.
                   특정 기간 이벤트나 긴급 상황 시 높은 우선순위 정책을 활성화하세요.
                 </li>
                 <li>
                   <strong>작업별 모델 할당:</strong> '모델 선호도' 탭에서 <code>Code Generation</code>에는 <code>claude-3-opus, gpt-4</code>를, 
                   단순 <code>Explanation</code>에는 <code>gpt-3.5-turbo</code>를 지정하면 비용 효율과 성능을 모두 잡을 수 있습니다.
                 </li>
                 <li>
                   <strong>시뮬레이터 활용:</strong> 정책을 저장하기 전에 'Routing Simulator' 탭에서 반드시 테스트해보세요. 
                   의도한 대로 모델이 선택되는지 미리 확인할 수 있습니다.
                 </li>
               </ul>
             </div>
           </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
