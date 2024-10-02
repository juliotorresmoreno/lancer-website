import { Fragment, useState } from "react";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ArrowRight, Check, CreditCard, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../store/hooks";
import useFetch from "../hooks/useFetch";
import { Link } from "@remix-run/react";
import { Plan } from "../models/plan";
import { Profile } from "../models/profile";

const PlanCard: React.FC<{
  plan: Plan;
  userProfile?: Profile;
  isSelected: boolean;
  isCurrentPlan: boolean;
  onSelect: (planId: number) => void;
}> = ({ plan, userProfile, isSelected, isCurrentPlan, onSelect }) => {
  return (
    <Card className={`bg-white ${isSelected ? "border-primary" : ""}`}>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>
          ${plan.price} / {plan.billingPeriod}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          <li className="flex items-center">
            {plan.realTimeChat ? (
              <Check className="text-green-500 mr-2" />
            ) : (
              <X className="text-red-500 mr-2" />
            )}
            Real-time chat
          </li>
          <li className="flex items-center">
            {plan.voiceCalls ? (
              <Check className="text-green-500 mr-2" />
            ) : (
              <X className="text-red-500 mr-2" />
            )}
            Voice calls
          </li>
          <li className="flex items-center">
            {plan.videoCalls ? (
              <Check className="text-green-500 mr-2" />
            ) : (
              <X className="text-red-500 mr-2" />
            )}
            Video calls
          </li>
          <li className="flex items-center">
            <Check className="text-green-500 mr-2" />
            {plan.maxApps === 0 ? "Unlimited" : plan.maxApps} app
            {plan.maxApps !== 1 ? "s" : ""}
          </li>
          <li className="flex items-center">
            <Check className="text-green-500 mr-2" />
            {plan.secureConnections === 0
              ? "Unlimited"
              : plan.secureConnections}
            secure connection{plan.secureConnections !== 1 ? "s" : ""}
          </li>
          <li className="flex items-center">
            <Check className="text-green-500 mr-2" />
            {plan.supportLevel.charAt(0).toUpperCase() +
              plan.supportLevel.slice(1)}
            support
          </li>
          <li className="flex items-center">
            {plan.apiIntegration ? (
              <Check className="text-green-500 mr-2" />
            ) : (
              <X className="text-red-500 mr-2" />
            )}
            API integration
          </li>
          <li className="flex items-center">
            {plan.dedicatedAccountManager ? (
              <Check className="text-green-500 mr-2" />
            ) : (
              <X className="text-red-500 mr-2" />
            )}
            Dedicated account manager
          </li>
        </ul>
        {userProfile?.hasPaymentMethod && (
          <Button
            className="mt-4 w-full"
            variant={isCurrentPlan ? "secondary" : "default"}
            onClick={() => onSelect(plan.id)}
            disabled={isCurrentPlan}
          >
            {isCurrentPlan ? "Current Plan" : "Select Plan"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default function ActivePlan() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = useAppSelector((state) => state.auth.token);
  const fetch = useFetch();

  const {
    data: plans,
    isLoading: isLoadingPlans,
    error: plansError,
  } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const response = await fetch("/plans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch plans");
      }
      const data = await response.json();
      return data.data;
    },
    retry: true,
    retryDelay: 5000,
    refetchInterval: 60000 * 5,
  });

  const {
    data: userProfile,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async (): Promise<Profile> => {
      const response = await fetch("/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    },
    retry: true,
    retryDelay: 5000,
    refetchInterval: 60000 * 5,
  });

  const assignPlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch("/users/assign-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData);
        throw new Error(errorData.message || "Failed to assign plan");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setSelectedPlanId(null);
      setIsChangePlanDialogOpen(false);
      toast({
        title: "Plan updated successfully",
        description: "Your active plan has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlanSelection = (planId: number) => {
    setSelectedPlanId(planId);
    setIsChangePlanDialogOpen(true);
  };

  const handlePlanUpdate = () => {
    if (selectedPlanId) {
      assignPlanMutation.mutate(selectedPlanId);
    }
  };

  if (isLoadingPlans || isLoadingProfile) {
    return <div>Loading plans and profile...</div>;
  }

  if (plansError || profileError) {
    return <div>Error loading plans or profile. Please try again.</div>;
  }

  const currentPlan = userProfile?.currentPlan;
  const selectedPlan = (plans ?? [])?.find(
    (plan) => plan.id === selectedPlanId
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Active Plan</h2>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your current subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan ? (
            <div className="space-y-2">
              <p>
                <strong>Plan:</strong> {currentPlan.plan.name}
              </p>
              <p>
                <strong>Price:</strong> ${currentPlan.plan.price} /
                {currentPlan.plan.billingPeriod}
              </p>
              <p>
                <strong>Activated:</strong>
                {new Date(currentPlan.activatedAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p>No active plan. Select a plan below to get started.</p>
          )}
        </CardContent>
      </Card>

      {!userProfile?.hasPaymentMethod && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              No payment method added yet. Add a payment method to unlock
              premium features.
            </p>
            <Button asChild>
              <Link to="/dashboard/payment-methods">
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Payment Method <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {userProfile?.hasPaymentMethod && (
        <Fragment>
          <h3 className="text-xl font-semibold">Available Plans</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans?.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                userProfile={userProfile}
                isSelected={plan.id === selectedPlanId}
                isCurrentPlan={plan.id === currentPlan?.plan.id}
                onSelect={handlePlanSelection}
              />
            ))}
          </div>
        </Fragment>
      )}

      <Dialog
        open={isChangePlanDialogOpen}
        onOpenChange={setIsChangePlanDialogOpen}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Plan Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change your plan to {selectedPlan?.name}?
              {selectedPlan?.code === "FREE" &&
                currentPlan?.plan.code !== "FREE" && (
                  <p className="mt-2 text-yellow-600">
                    Note: Switching to the Free plan will immediately end your
                    current subscription.
                  </p>
                )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChangePlanDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePlanUpdate}
              disabled={assignPlanMutation.isPending}
            >
              {assignPlanMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
