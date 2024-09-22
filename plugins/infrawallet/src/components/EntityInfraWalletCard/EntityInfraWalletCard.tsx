import React, { useState, useEffect } from 'react';
import { Progress, InfoCard } from '@backstage/core-components';
import { Alert } from '@material-ui/lab';
import { useApi } from '@backstage/core-plugin-api';
import { infraWalletApiRef } from '../../api/InfraWalletApi';
import { useEntity, catalogApiRef } from '@backstage/plugin-catalog-react';
import { Report, Tag } from '../../api/types';
import { Card, CardContent, Typography } from '@material-ui/core';

export const EntityInfraWalletCard = () => {
  const { entity } = useEntity();
  const infrawalletApi = useApi(infraWalletApiRef);
  const catalogApi = useApi(catalogApiRef);

  const [gcpProjectIds, setGcpProjectIds] = useState<string[]>([]);
  const [costData, setCostData] = useState<Report[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const fetchGcpProjectIds = async () => {
      try {
        let projectIds: string[] = [];

        const annotationGcpProjectIds = entity.metadata.annotations?.['infrawallet.io/gcp-project-ids'];
        if (annotationGcpProjectIds) {
          projectIds = annotationGcpProjectIds.split(',').map(id => id.trim());
        }

        const dependsOnRelations = entity.relations?.filter(rel => rel.type === 'dependsOn') || [];
        const targetEntityRefs = dependsOnRelations.map(rel => rel.targetRef);

        const targetEntitiesPromises = targetEntityRefs.map(ref => catalogApi.getEntityByRef(ref));
        const targetEntities = await Promise.all(targetEntitiesPromises);

        for (const targetEntity of targetEntities) {
          if (
            targetEntity?.kind.toLocaleLowerCase('en-US') === 'resource' &&
            targetEntity.spec?.type === 'gcp-project'
          ) {
            const gcpProjectId = targetEntity.metadata.name;
            projectIds.push(gcpProjectId);
          }
        }

        setGcpProjectIds(projectIds);
        setDebugInfo(prev => prev + `Resolved GCP Project IDs: ${projectIds.join(', ')}\n`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error occurred');
      }
    };

    fetchGcpProjectIds();
  }, [entity, catalogApi]);

  useEffect(() => {
    const fetchCostData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (gcpProjectIds.length === 0) {
          setCostData(null);
          setLoading(false);
          return;
        }

        const filters = `(${gcpProjectIds.map(id => `gcp_project_id=${id}`).join(' OR ')})`;
        const tags: Tag[] = [];
        const groups = '';
        const granularity = 'monthly';
        const endTime = new Date();
        const startTime = new Date();
        startTime.setMonth(endTime.getMonth() - 1);

        setDebugInfo(prev => prev + `Filters: ${filters}\n`);

        const costReportsResponse = await infrawalletApi.getCostReports(
          filters,
          tags,
          groups,
          granularity,
          startTime,
          endTime,
        );

        if (costReportsResponse.status !== 200) {
          throw new Error('Failed to fetch cost reports');
        }

        setCostData(costReportsResponse.data || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCostData();
  }, [gcpProjectIds, infrawalletApi]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!costData || costData.length === 0) {
    return <Alert severity="info">No cost data available for this entity.</Alert>;
  }

  return (
    <InfoCard title="Cost Information">
      <Typography variant="body2">
        <pre>{debugInfo}</pre>
      </Typography>
      {costData.map((report: Report) => (
        <Card variant="outlined" key={report.id} style={{ marginBottom: '16px' }}>
          <CardContent>
            <Typography variant="h6">Project ID: {report.id}</Typography>
            <Typography variant="body2">
              {Object.entries(report.reports).map(([period, cost]) => (
                <div key={period}>
                  {period}: ${Number(cost).toFixed(2)}
                </div>
              ))}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </InfoCard>
  );
};
